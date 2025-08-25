const sql = require('mssql');
const poolPromise = require('../config/db.config');

// Create or update a user record
async function upsertUser(whatsappNumber, fullName = null) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('whatsappNumber', sql.VarChar(20), whatsappNumber)
            .input('fullName', sql.NVarChar(100), fullName)
            .input('lastGreetingSent', sql.DateTime, new Date())
            .query(`
                MERGE INTO Users AS target
                USING (SELECT @whatsappNumber AS WhatsAppNumber, @fullName AS FullName, @lastGreetingSent AS LastGreetingSent) AS source
                ON target.WhatsAppNumber = source.WhatsAppNumber
                WHEN MATCHED THEN
                    UPDATE SET 
                        FullName = ISNULL(source.FullName, target.FullName),
                        LastActivity = GETDATE()
                WHEN NOT MATCHED THEN
                    INSERT (WhatsAppNumber, FullName, CreatedAt, LastActivity, LastGreetingSent)
                    VALUES (source.WhatsAppNumber, source.FullName, GETDATE(), GETDATE(), source.LastGreetingSent);
                
                SELECT UserID, LastGreetingSent FROM Users WHERE WhatsAppNumber = @whatsappNumber;
            `);
        
        return result.recordset[0];
    } catch (err) {
        console.error('User upsert error:', err.message);
        return null;
    }
}

// Check whether a greeting should be sent (1-minute rule)
async function shouldSendGreeting(whatsappNumber) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('whatsappNumber', sql.VarChar(20), whatsappNumber)
            .query(`
                SELECT 
                    UserID,
                    LastGreetingSent,
                    DATEDIFF(MINUTE, LastGreetingSent, GETDATE()) as MinutesSinceLastGreeting
                FROM Users 
                WHERE WhatsAppNumber = @whatsappNumber
            `);
        
        if (!result.recordset.length) {
            return { shouldSend: true, userID: null, isNewUser: true };
        }
        
        const user = result.recordset[0];
        const minutesSinceLastGreeting = user.MinutesSinceLastGreeting || 5; // Null ise 5 dakika
        
        return {
            shouldSend: minutesSinceLastGreeting >= 1,
            userID: user.UserID,
            isNewUser: false,
            minutesSinceLastGreeting
        };
    } catch (err) {
        console.error('Greeting check error:', err.message);
        return { shouldSend: true, userID: null, isNewUser: true };
    }
}

// Get user's active process if exists
async function getActiveProcess(userID) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userID', sql.Int, userID)
            .query(`
                SELECT TOP 1 ProcessID, Status, LastActivity
                FROM Processes 
                WHERE UserID = @userID 
                AND EndTime IS NULL
                AND (Status IS NULL OR Status = 'active')
                ORDER BY StartTime DESC
            `);
        
        return result.recordset[0] || null;
    } catch (err) {
        console.error('Active process lookup error:', err.message);
        return null;
    }
}

// Create a new process row
async function createProcess(userID) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userID', sql.Int, userID)
            .query(`
                INSERT INTO Processes (UserID, StartTime, LastActivity)
                OUTPUT inserted.ProcessID
                VALUES (@userID, GETDATE(), GETDATE())
            `);
        
        return result.recordset[0].ProcessID;
    } catch (err) {
        console.error('Process creation error:', err.message);
        return null;
    }
}

// Update process last activity timestamp
async function updateProcessActivity(processID) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('processID', sql.Int, processID)
            .query(`
                UPDATE Processes 
                SET LastActivity = GETDATE()
                WHERE ProcessID = @processID
            `);
        return true;
    } catch (err) {
        console.error('Process activity update error:', err.message);
        return false;
    }
}

// Update user's last greeting timestamp
async function updateGreetingTime(whatsappNumber) {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('whatsappNumber', sql.VarChar(20), whatsappNumber)
            .query(`
                UPDATE Users 
                SET LastGreetingSent = GETDATE()
                WHERE WhatsAppNumber = @whatsappNumber
            `);
        return true;
    } catch (err) {
        console.error('Greeting timestamp update error:', err.message);
        return false;
    }
}

// Persist a message (central point for message logging)
async function saveMessage(processID, direction, messageType, content, processType = null, processData = null, processResult = null) {
    try {
        const pool = await poolPromise;
        
        // Süreç aktivitesini güncelle
        await updateProcessActivity(processID);
        
        await pool.request()
            .input('processID', sql.Int, processID)
            .input('direction', sql.Char(3), direction)
            .input('messageType', sql.NVarChar(50), messageType)
            .input('content', sql.NVarChar(sql.MAX), content)
            .input('processType', sql.NVarChar(50), processType)
            .input('processData', sql.NVarChar(sql.MAX), processData ? JSON.stringify(processData) : null)
            .input('processResult', sql.NVarChar(sql.MAX), processResult ? JSON.stringify(processResult) : null)
            .query(`
                INSERT INTO Messages (ProcessID, Direction, MessageType, Content, ProcessType, ProcessData, ProcessResult)
                VALUES (@processID, @direction, @messageType, @content, @processType, @processData, @processResult)
            `);
        
        return true;
    } catch (err) {
        console.error('Message persistence error:', err.message);
        return null;
    }
}

// Mark a process as ended
async function endProcess(processID, status = 'completed') {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('processID', sql.Int, processID)
            .input('endTime', sql.DateTime, new Date())
            .query(`
                UPDATE Processes 
                SET Status = 0, EndTime = @endTime
                WHERE ProcessID = @processID AND EndTime IS NULL
            `);
        // Return true only if we actually ended an open process (rowsAffected > 0)
        return (result.rowsAffected && result.rowsAffected[0] > 0);
    } catch (err) {
        console.error('Process end error:', err.message);
        return false;
    }
}

// Close processes that have timed out (no activity for >= 1 minute)
async function checkAndEndTimeoutProcesses() {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                UPDATE Processes 
                SET Status = 0, EndTime = GETDATE()
                WHERE EndTime IS NULL
                AND (Status IS NULL OR Status = 'active')
                AND DATEDIFF(MINUTE, LastActivity, GETDATE()) >= 1
            `);
        
        return result.rowsAffected[0];
    } catch (err) {
        console.error('Timeout check error:', err.message);
        return 0;
    }
}

// Fetch users whose processes just timed out (for notification)
async function getTimeoutProcessUsers() {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT DISTINCT u.WhatsAppNumber, p.ProcessID
                FROM Processes p
                JOIN Users u ON p.UserID = u.UserID
                WHERE p.Status = 0 
                AND p.EndTime >= DATEADD(MINUTE, -1, GETDATE())
                AND NOT EXISTS (
                    SELECT 1 FROM Messages m 
                    WHERE m.ProcessID = p.ProcessID 
                      AND m.Direction = 'OUT' 
                      AND m.ProcessType = 'session_end'
                )
            `);
        
        return result.recordset;
    } catch (err) {
        console.error('Timeout users fetch error:', err.message);
        return [];
    }
}

// Sales status lookup
async function getSalesStatus(talepNo) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('talepNo', sql.VarChar, talepNo)
            .query(`
                SELECT TOP 1 [Talep No] AS TalepNo, [Satış Durumu] AS SatisDurumu
                FROM VW_SATISTALEPLERI
                WHERE [Talep No] = @talepNo
            `);
        
        return result.recordset[0] || null;
    } catch (err) {
        console.error('Sales status query error:', err.message);
        return null;
    }
}

// Retrieve invoice PDF as base64
async function getInvoicePDF(faturaNo, phoneNumber) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('faturaNo', sql.VarChar, faturaNo)
            .input('phoneNumber', sql.VarChar, phoneNumber)
            .query(`
                SELECT TOP 1 PDFData
                FROM VW_FATURALAR
                WHERE FaturaNo = @faturaNo
                AND PhoneNumber = @phoneNumber
            `);

        if (!result.recordset.length) return null;

        const pdfBuffer = result.recordset[0].PDFData;
        return Buffer.isBuffer(pdfBuffer) ? pdfBuffer.toString('base64') : pdfBuffer;
    } catch (err) {
        console.error('Invoice fetch error:', err.message);
        return null;
    }
}

// Retrieve delivery note PDF as base64 (New function)
async function getDeliveryNotePDF(irsaliyeNo, phoneNumber) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('irsaliyeNo', sql.VarChar, irsaliyeNo)
            .input('phoneNumber', sql.VarChar, phoneNumber)
            .query(`
                SELECT TOP 1 PDFData
                FROM VW_IRSALIYELER // Bu View'ın var olduğu varsayılıyor
                WHERE IrsaliyeNo = @irsaliyeNo
                AND PhoneNumber = @phoneNumber
            `);

        if (!result.recordset.length) return null;

        const pdfBuffer = result.recordset[0].PDFData;
        return Buffer.isBuffer(pdfBuffer) ? pdfBuffer.toString('base64') : pdfBuffer;
    } catch (err) {
        console.error('Delivery note fetch error:', err.message);
        return null;
    }
}

// Get chronological process message history
async function getProcessHistory(processID) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('processID', sql.Int, processID)
            .query(`
                SELECT 
                    Direction,
                    MessageType,
                    Content,
                    ProcessType,
                    ProcessData,
                    ProcessResult,
                    Timestamp
                FROM Messages 
                WHERE ProcessID = @processID
                ORDER BY Timestamp
            `);
        
        return result.recordset;
    } catch (err) {
        console.error('Process history error:', err.message);
        return [];
    }
}

// Get conversation report with first/last flags
async function getConversationReport(processID) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('processID', sql.Int, processID)
            .query(`
                WITH Ordered AS (
                    SELECT 
                        ProcessID,
                        Direction,
                        MessageType,
                        Content,
                        ProcessType,
                        ProcessData,
                        ProcessResult,
                        Timestamp,
                        ROW_NUMBER() OVER (ORDER BY Timestamp ASC) AS rnAsc,
                        ROW_NUMBER() OVER (ORDER BY Timestamp DESC) AS rnDesc
                    FROM Messages
                    WHERE ProcessID = @processID
                )
                SELECT 
                    ProcessID,
                    Direction,
                    MessageType,
                    Content,
                    ProcessType,
                    ProcessData,
                    ProcessResult,
                    Timestamp,
                    CASE WHEN rnAsc = 1 THEN 1 ELSE 0 END AS IsFirst,
                    CASE WHEN rnDesc = 1 THEN 1 ELSE 0 END AS IsLast
                FROM Ordered
                ORDER BY Timestamp ASC
            `);
        return result.recordset;
    } catch (err) {
        console.error('Conversation report error:', err.message);
        return [];
    }
}

// Aggregate user statistics
async function getUserStats(userID) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('userID', sql.Int, userID)
            .query(`
                SELECT 
                    COUNT(DISTINCT p.ProcessID) as TotalProcesses,
                    COUNT(m.ProcessID) as TotalMessages,
                    COUNT(CASE WHEN m.ProcessType IS NOT NULL THEN 1 END) as TotalProcessTypes,
                    MAX(p.LastActivity) as LastActivity
                FROM Processes p
                LEFT JOIN Messages m ON p.ProcessID = m.ProcessID
                WHERE p.UserID = @userID
            `);
        
        return result.recordset[0];
    } catch (err) {
        console.error('User stats error:', err.message);
        return null;
    }
}

module.exports = {
    upsertUser,
    shouldSendGreeting,
    getActiveProcess,
    createProcess,
    updateProcessActivity,
    updateGreetingTime,
    saveMessage,
    endProcess,
    checkAndEndTimeoutProcesses,
    getTimeoutProcessUsers,
    getSalesStatus,
    getInvoicePDF,
    getDeliveryNotePDF, 
    getProcessHistory,
    getUserStats,
    getConversationReport
};
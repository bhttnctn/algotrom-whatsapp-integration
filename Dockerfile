# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your app
COPY . .

# Expose the port your app uses (keep in sync with PORT env or default 3000)
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]

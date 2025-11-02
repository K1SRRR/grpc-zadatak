FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY client/package*.json ./

# Install dependencies
RUN npm install

# Copy shared proto files
COPY proto ../proto

# Copy client code
COPY client/client.js ./

# Start the client
CMD ["npm", "start"]

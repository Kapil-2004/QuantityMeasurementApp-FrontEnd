# Step 1: Build the Angular application
FROM node:18-alpine AS build
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source and build the project
COPY . .
RUN npm run build -- --configuration production

# Step 2: Serve the application using Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built files from the build stage
# Note: The path dist/frontend-angular is based on your angular.json outputPath
COPY --from=build /app/dist/frontend-angular /usr/share/nginx/html

# Custom nginx configuration for Angular routing
RUN echo 'server { \
    listen 80; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

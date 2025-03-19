# Use an official Nginx runtime as a parent image
FROM nginx:latest

# Copy your website files into the Nginx default web directory
COPY . /usr/share/nginx/html

# Expose port 80, which Nginx uses by default
EXPOSE 80

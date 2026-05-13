FROM node:20-alpine

WORKDIR /appWeb

COPY package.json package-lock.json* ./
RUN npm ci --silent

COPY . .

EXPOSE 3000

# The --host 0.0.0.0 option ensures Vite is accessible from outside the container.
# The port is set to 3000 to match docker-compose.yml mappings.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "3000"]

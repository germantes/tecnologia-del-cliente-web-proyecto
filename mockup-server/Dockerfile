FROM node:20-alpine

WORKDIR /app

# Copiar package files e instalar dependencias
# node_modules se instala en /app/node_modules dentro de la imagen
COPY package*.json ./
RUN npm install

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 3000

# Usar nodemon para hot reload en desarrollo
CMD ["npm", "run", "dev"]

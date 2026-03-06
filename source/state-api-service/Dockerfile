# Usa un'immagine leggera di Node.js
FROM node:20-alpine

# Imposta la cartella di lavoro nel container
WORKDIR /usr/src/app

# Copia i file delle dipendenze
COPY package*.json ./
COPY tsconfig.json ./

# Installa tutte le dipendenze
RUN npm install

# Copia tutto il codice sorgente (la cartella src)
COPY src/ ./src/

# Compila il codice TypeScript in JavaScript
RUN npm run build

# Esponi la porta usata da Express/Socket.io
EXPOSE 3001

# Comando per avviare il microservizio
CMD ["npm", "start"]
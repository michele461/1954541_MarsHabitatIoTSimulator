# Develop:

## Required:
- pnpm 10.30.3 
    ```bash
    npm install -g pnpm
    ```
- Docker and Docker Compose

## How To Build:

### Local Run:
Go in the workspace dir, install the devs and build the code
```bash
cd source/workspace/
pnpm install
```

### Docker Run:
Go in the source dir, build the dockers and run them
```bash
cd source/
docker compose build # aggiungere --no-cache se mantiene delle immagini vecchie dopo la build
docker compose up
```
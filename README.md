# Develop:

## Required:
- pnpm 10.30.3 
    ```bash
    npm install -g pnpm
    ```
- Docker and Docker Compose

## How To Build:
Go in the workspace dir, install the dependencies
```bash
cd source/workspace/
pnpm install
```

## How to Run:
Go in the source dir, build the docker images and run the containers
```bash
cd source/
docker compose build
docker compose up
```

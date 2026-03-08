# Develop:

## Required:
- pnpm 10.30.3 
    ```
    npm install -g pnpm
    ```
- Docker and Docker Compose

## How To Build:

### Local Run:
Go in the workspace dir, install the devs and build the code
```
cd source/workspace/
pnpm install
pnpm build -r
```

### Docker Run:
Go in the source dir, build the dockers and run them
```
cd source/
docker compose build
docker compose up
```
-> MERN Notes & Tasks: CI/CD with Jenkins, Docker, ECR and EC2

A MERN (MongoDB, Express, React, Node.js) notes app that is deployed automatically.
Every `git push` to GitHub triggers a Jenkins pipeline that builds Docker images,
pushes them to Amazon ECR and deploys them to an EC2 Docker host with Docker Compose.

-> Tools used

| Area | Tool |
|------|------|
| Source control | GitHub |
| Trigger | GitHub Webhook |
| CI/CD | Jenkins Pipeline (`Jenkinsfile`) |
| Build | npm (Jenkins npm stages), Docker |
| Image registry | Amazon ECR |
| Deployment host | Amazon EC2 |
| Orchestration | Docker Compose |
| Database | MongoDB |

-> CI/CD flowchart
mermaid
flowchart TD
    A["Developer pushes code to GitHub"] --> B["GitHub Webhook sends push event"]
    B --> C["Jenkins on EC2 starts the pipeline"]
    C --> D["Stage 1: Checkout code from GitHub"]
    D --> E["Stage 2: npm install and build frontend"]
    E --> F["Stage 3: npm install and test backend"]
    F --> G["Stage 4: Build frontend and backend Docker images"]
    G --> H["Stage 5: Login to ECR and push both images"]
    H --> I["Stage 6: Copy docker-compose.yml to Docker host over SSH"]
    I --> J["Docker host logs in to ECR and pulls the new images"]
    J --> K["docker compose up -d recreates the containers"]
    K --> L["New version is live on port 80"]

If any stage fails, Jenkins stops the pipeline, marks the build as failed and
the running version of the app stays unchanged.

## How the running app works
mermaid
flowchart LR
    U["User browser"] -->|"HTTP port 80"| N["Frontend container: Nginx serving the React build"]
    N -->|"/api requests are proxied"| B["Backend container: Node.js and Express on port 5000"]
    B -->|"Mongoose"| M[("MongoDB container with a persistent volume")]

-> Working step by step

1. Push- A developer commits and pushes code to the GitHub repository.
2. Webhook- GitHub sends a request to `http://<EC2-IP>:8080/github-webhook/`.
3. Jenkins starts- The pipeline defined in the `Jenkinsfile` runs on the Jenkins server.
4. Checkout- Jenkins pulls the latest code.
5. npm stages- Jenkins installs the dependencies and builds the React frontend, then installs the backend dependencies and runs its tests if there are any.
6. Docker build- Two images are built: `mern-frontend` (React build served by Nginx) and `mern-backend` (Node.js and Express). Each image is tagged with the Jenkins build number.
7. Push to ECR- Jenkins logs in to Amazon ECR with its AWS credentials and pushes both images.
8. Deploy- Jenkins connects to the Docker host over SSH, copies `docker-compose.yml`, logs in to ECR, pulls the new images and runs `docker compose up -d`.
9. Result- Docker Compose starts three containers: frontend, backend and MongoDB. The app is available on port 80 of the EC2 instance.

## Application features

- Create notes with a title, text and colour
- Add checklist tasks to any note and tick them off, with a progress bar
- Delete tasks and notes
- Edit and pin notes
- Search across notes and tasks

## REST API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/notes` | List all notes |
| POST | `/api/notes` | Create a note (optionally with tasks) |
| PUT | `/api/notes/:id` | Edit title, content, colour or pin |
| DELETE | `/api/notes/:id` | Delete a note |
| POST | `/api/notes/:id/tasks` | Add a task |
| PATCH | `/api/notes/:id/tasks/:taskId` | Tick or untick a task |
| DELETE | `/api/notes/:id/tasks/:taskId` | Delete a task |
| GET | `/api/health` | Health check |

-> Project structure

|-- Jenkinsfile              # CI/CD pipeline
|-- docker-compose.yml       # frontend + backend + MongoDB
|-- backend/
|   |-- Dockerfile
|   |-- package.json
|   |-- server.js            # Express API + Mongoose models
|-- frontend/
    |-- Dockerfile           # multi-stage: Node build, then Nginx
    |-- nginx.conf           # serves React and proxies /api to the backend
    |-- package.json
    |-- index.html
    |-- src/
        |-- main.jsx
        |-- App.jsx
        |-- styles.css

-> Run locally

Requires Docker Desktop.

docker compose up --build

Open `http://localhost`. Stop with `Ctrl+C` and remove the containers with `docker compose down`.

-> Infrastructure setup (one time)

1. Create two private ECR repositories: `mern-frontend` and `mern-backend`.
2. Launch an EC2 instance (Amazon Linux 2023) and open ports 22, 80 and 8080 in its security group.
3. Install Docker, Docker Compose, Git, Node.js 20, Java 17 and Jenkins. Add the `jenkins` user to the `docker` group.
4. In Jenkins, install the Pipeline, Docker Pipeline, SSH Agent and AWS Credentials plugins.
5. Add two Jenkins credentials: `aws-creds` (AWS access keys) and `ec2-ssh-key` (the EC2 private key).
6. Create a Pipeline job from SCM that points to this repository.
7. Add the GitHub webhook `http://<EC2-IP>:8080/github-webhook/` (content type `application/json`, push events).

## 🐳 Zagon v Dockerju

### 1. Zgradi Docker image

```bash
docker build -t subscription-service .
```

2. Zaženi container (z isto .env datoteko)

```bash
docker run --env-file .env -p 3005:3005 subscription-service
```

## 📘 Swagger dokumentacija

👉 **http://localhost:3005/api**

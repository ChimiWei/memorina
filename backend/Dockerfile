# Stage 1: Build the binary
FROM golang:1.26.1-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o main .

# Stage 2: Run the binary
FROM scratch
COPY --from=builder /app/main /main
EXPOSE :7777
ENTRYPOINT ["/main"]
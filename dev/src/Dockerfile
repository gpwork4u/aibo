## Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# 安裝必要套件
RUN apk add --no-cache git

# 複製 go.mod 和 go.sum，先下載依賴（利用 Docker cache）
COPY go.mod go.sum ./
RUN go mod download

# 複製原始碼
COPY . .

# 編譯
RUN CGO_ENABLED=0 GOOS=linux go build -o /api-server .

## Runtime stage
FROM alpine:3.20

WORKDIR /app

# 安裝 ca-certificates（HTTPS 需要）
RUN apk add --no-cache ca-certificates tzdata

# 複製編譯好的執行檔
COPY --from=builder /api-server .

EXPOSE 8080

CMD ["./api-server"]

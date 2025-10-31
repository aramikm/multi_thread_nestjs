# NestJS Parallel Crypto API

High-performance encryption/decryption API using Worker Threads for parallel processing.

## Setup

```bash
npm install
npm run build
npm run start
```

## API Usage

### Encrypt Endpoint
```bash
curl -X POST http://localhost:3000/crypto/encrypt \
  -H "Content-Type: application/json" \
  -d '{
    "data": ["Hello World", "Secret Message", "Another Text"],
    "key": "mySecretKey123"
  }'
```

### Decrypt Endpoint
```bash
curl -X POST http://localhost:3000/crypto/decrypt \
  -H "Content-Type: application/json" \
  -d '{
    "encryptedData": ["<encrypted-string-1>", "<encrypted-string-2>"],
    "key": "mySecretKey123"
  }'
```

## Features

- **Parallel Processing**: Utilizes all available CPU cores
- **Worker Threads**: Each CPU core runs independent encryption/decryption tasks
- **AES-256-CBC**: Secure encryption algorithm
- **High Throughput**: Processes multiple items simultaneously
- **Performance Metrics**: Returns processing time and thread count

## Architecture

The service automatically:
1. Detects the number of available CPU cores
2. Splits input data into chunks (one per CPU core)
3. Spawns worker threads for parallel processing
4. Aggregates results from all threads

This approach maximizes CPU utilization and throughput for bulk encryption/decryption operations.
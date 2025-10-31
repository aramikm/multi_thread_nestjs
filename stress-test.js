// stress-test.js
const http = require('http');

function makeRequest(data, key, endpoint) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ data, key });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/crypto/${endpoint}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function stressTest() {
  console.log('Starting stress test...\n');

  // Generate test data
  const items = Array.from({ length: 1000 }, (_, i) => 
    `Message ${i} - Lorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consecteturLorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consecteturLorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consecteturLorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consecteturLorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consecteturLorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consecteturLorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consecteturLorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consecteturLorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consecteturLorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consecteturLorem ipsum dolor sit amet consectetur - Lorem ipsum dolor sit amet consectetur- Lorem ipsum dolor sit amet consectetur`
  );
  const key = 'testKey123';
  const REQUESTS = 100;

  // Calculate data size
  const itemSizeBytes = Buffer.byteLength(items[0], 'utf8');
  const totalDataSizeBytes = itemSizeBytes * items.length;
  const totalDataSizeKB = (totalDataSizeBytes / 1024).toFixed(2);
  const totalDataSizeMB = (totalDataSizeBytes / (1024 * 1024)).toFixed(2);

  console.log(`Data per request: ${items.length} items`);
  console.log(`Size per item: ${itemSizeBytes} bytes`);
  console.log(`Total data per request: ${totalDataSizeKB} KB (${totalDataSizeMB} MB)`);
  console.log('---');

  // Run 100 concurrent encryption requests
  console.log(`Testing encryption with ${REQUESTS} concurrent requests...\n`);
  const start = Date.now();
  
  let completedCount = 0;
  const promises = Array.from({ length: REQUESTS }, async (_, i) => {
    const reqStart = Date.now();
    const result = await makeRequest(items, key, 'encrypt');
    const reqDuration = Date.now() - reqStart;
    completedCount++;
    
    // Calculate throughput for this request
    const throughputMBps = (totalDataSizeBytes / (1024 * 1024)) / (reqDuration / 1000);
    const throughputItemsPerSec = items.length / (reqDuration / 1000);
    
    console.log(`Request ${i + 1}: ${reqDuration}ms | ${totalDataSizeMB} MB | ${throughputMBps.toFixed(2)} MB/s | ${throughputItemsPerSec.toFixed(0)} items/s | Threads: ${result.threadsUsed}`);
    return result;
  });

  const results = await Promise.all(promises);
  const totalDuration = Date.now() - start;

  // Calculate aggregate throughput
  const totalItemsProcessed = REQUESTS * items.length;
  const totalDataProcessedBytes = REQUESTS * totalDataSizeBytes;
  const totalDataProcessedMB = totalDataProcessedBytes / (1024 * 1024);
  const totalDurationSeconds = totalDuration / 1000;
  
  const aggregateThroughputMBps = totalDataProcessedMB / totalDurationSeconds;
  const aggregateThroughputItemsPerSec = totalItemsProcessed / totalDurationSeconds;

  console.log('\n=== SUMMARY ===');
  console.log(`Total wall time: ${totalDuration}ms (${totalDurationSeconds.toFixed(2)}s)`);
  console.log(`Average per request: ${(totalDuration / REQUESTS).toFixed(0)}ms`);
  console.log(`Threads used: ${results[0].threadsUsed}`);
  console.log(`Total items processed: ${totalItemsProcessed.toLocaleString()}`);
  console.log(`Total data processed: ${totalDataProcessedMB.toFixed(2)} MB`);
  console.log('\n=== THROUGHPUT ===');
  console.log(`Aggregate throughput: ${aggregateThroughputMBps.toFixed(2)} MB/s`);
  console.log(`Aggregate throughput: ${aggregateThroughputItemsPerSec.toFixed(0)} items/s`);
  console.log(`Aggregate throughput: ${(aggregateThroughputItemsPerSec / 1000).toFixed(2)}K items/s`);
}

stressTest().catch(console.error);
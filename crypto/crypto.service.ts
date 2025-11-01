import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Worker } from 'worker_threads';
import * as os from 'os';
import * as path from 'path';

interface WorkerTask {
  chunk: string[];
  key: string;
  operation: 'encrypt' | 'decrypt';
  resolve: (value: string[]) => void;
  reject: (error: Error) => void;
}

interface WorkerState {
  worker: Worker;
  busy: boolean;
}

@Injectable()
export class CryptoService implements OnModuleInit, OnModuleDestroy {
  private readonly numCPUs = os.cpus().length;
  private workerPool: WorkerState[] = [];
  private taskQueue: WorkerTask[] = [];
  private requestQueue: Promise<any> = Promise.resolve();

  async onModuleInit() {
    this.initializeWorkerPool();
  }

  async onModuleDestroy() {
    // Clean up workers on shutdown
    await Promise.all(
      this.workerPool.map(({ worker }) => worker.terminate())
    );
  }

  getWorkerCount(): number {
    return this.numCPUs;
  }

  private initializeWorkerPool() {
    for (let i = 0; i < this.numCPUs; i++) {
      const worker = new Worker(path.join(__dirname, 'crypto.worker.js'));
      
      const workerState: WorkerState = {
        worker,
        busy: false,
      };

      worker.on('message', (result) => this.handleWorkerMessage(workerState, result));
      worker.on('error', (error) => this.handleWorkerError(workerState, error));
      worker.on('exit', (code) => {
        if (code !== 0) {
          console.error(`Worker stopped with exit code ${code}`);
        }
      });

      this.workerPool.push(workerState);
    }
  }

  private handleWorkerMessage(workerState: WorkerState, result: any) {
    workerState.busy = false;
    
    // Resolve the current task
    const task = workerState['currentTask'] as WorkerTask | undefined;
    if (task) {
      // Check if result contains an error
      if (result && result.error) {
        task.reject(new Error(result.error));
      } else {
        task.resolve(result);
      }
      delete workerState['currentTask'];
    }

    // Process next task in queue
    this.processNextTask();
  }

  private handleWorkerError(workerState: WorkerState, error: Error) {
    workerState.busy = false;
    
    const task = workerState['currentTask'] as WorkerTask | undefined;
    if (task) {
      task.reject(error);
      delete workerState['currentTask'];
    }

    // Process next task in queue
    this.processNextTask();
  }

  private processNextTask() {
    if (this.taskQueue.length === 0) return;

    const availableWorker = this.workerPool.find((w) => !w.busy);
    if (!availableWorker) return;

    const task = this.taskQueue.shift();
    if (!task) return;

    availableWorker.busy = true;
    availableWorker['currentTask'] = task;

    availableWorker.worker.postMessage({
      data: task.chunk,
      key: task.key,
      operation: task.operation,
    });
  }

  private runWorkerFromPool(
    chunk: string[],
    key: string,
    operation: 'encrypt' | 'decrypt',
  ): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const task: WorkerTask = { chunk, key, operation, resolve, reject };
      
      this.taskQueue.push(task);
      this.processNextTask();
    });
  }

  async encryptParallel(data: string[], key: string): Promise<string[]> {
    return this.queueRequest(() => this.processInParallel(data, key, 'encrypt'));
  }

  async decryptParallel(data: string[], key: string): Promise<string[]> {
    return this.queueRequest(() => this.processInParallel(data, key, 'decrypt'));
  }

  private queueRequest<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue = this.requestQueue
        .then(() => fn())
        .then(resolve)
        .catch(reject);
    });
  }

private async processInParallel(
    data: string[],
    key: string,
    operation: 'encrypt' | 'decrypt',
  ): Promise<string[]> {
    if (data.length === 0) return [];

    // Optimized fixed chunk size based on benchmarking
    // 500-1000 items per chunk balances:
    // - Worker overhead (too small = too many tasks)
    // - Parallelism (too large = underutilized CPUs)
    // - Memory efficiency (reasonable chunk sizes)
    const OPTIMAL_CHUNK_SIZE = 750;
    
    const chunks: string[][] = [];

    // Split data into fixed-size chunks
    for (let i = 0; i < data.length; i += OPTIMAL_CHUNK_SIZE) {
      chunks.push(data.slice(i, i + OPTIMAL_CHUNK_SIZE));
    }

    const results: string[] = [];

    // Process in batches to respect CPU limits
    const batchSize = this.numCPUs;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((chunk) => this.runWorkerFromPool(chunk, key, operation))
      );
      results.push(...batchResults.flat());
    }

    return results;
  }
}
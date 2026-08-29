### 🧪 How to Test Your Redis Caching Implementation

To verify that your Redis caching and BaseService integration are working perfectly, follow these steps:

#### Step 1: Start Redis Server
Make sure your local Redis server is running:
- **Windows (WSL / Docker / Native):** Start your Redis container or service so it listens on `127.0.0.1:6379`.
- When you start your backend (`npm run dev`), you should see:
  ```text
  🔄 Redis client connected
  ✅ Redis client ready and authenticated
  ```

#### Step 2: Test Course List API (`GET /api/courses`)
1. Open **Postman**, **Thunder Client**, or your browser and send a `GET` request to:
   `http://localhost:5000/api/courses`
2. **First Request (Cache MISS):**
   - Look at the JSON response. The `source` property will be `"database"` because it fetched fresh data from MongoDB and stored it in Redis.
   - Response time will be slightly slower (e.g., 40-80ms).
3. **Second Request (Cache HIT):**
   - Send the exact same `GET` request immediately again.
   - The `source` property will now be `"cache"` because it was fetched instantly from Redis without querying MongoDB!
   - Response time will be lightning-fast (e.g., 2-5ms).

#### Step 3: Test Cache Invalidation on Mutation (`POST / PUT / DELETE`)
1. Send a `POST` request to create a new course:
   `http://localhost:5000/api/courses` (with required course payload).
2. The `BaseService.create()` method automatically executes `cache.invalidatePattern('course:*')`.
3. Send another `GET /api/courses` request:
   - You will see that the `source` returns `"database"` once because the cache was successfully invalidated and refreshed with the newly added course!

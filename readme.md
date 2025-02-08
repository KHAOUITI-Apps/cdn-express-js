# Video Streaming CDN with Signed URLs

A simple Express.js-based Content Delivery Network (CDN) for streaming video files securely using signed URLs.

## Features

- **Signed URLs**: Generates time-limited, IP-bound signed URLs for secure video access.
- **Video Metadata**: Returns video details like `id`, `title`, `author`, `topic`, and `url`.
- **Partial Content Streaming**: Supports range requests for efficient video streaming.

## Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/video-cdn.git
   cd video-cdn
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Add video files**:
   - Place your `.mp4` files in the `/videos` directory.
   - Update `VIDEO_METADATA` in `server.js` with video titles, authors, and topics.

4. **Start the server**:
   ```bash
   npm start
   ```
   The server will run on `http://localhost:3000`.

## API Endpoints

- **GET `/api/videos`**: Returns a list of videos with metadata and signed URLs.
  ```json
  [
    {
      "id": "video1",
      "title": "Introduction to Node.js",
      "author": "John Doe",
      "topic": "Programming",
      "url": "/api/stream/video1?token=..."
    }
  ]
  ```

- **GET `/api/stream/:videoId`**: Streams the video if the signed URL is valid.

## Configuration

- **Secret Key**: Set `SECRET_KEY` in `server.js` for HMAC signing.
- **Video Directory**: Update `VIDEO_DIRECTORY` if videos are stored elsewhere.



Developed by [KHAOUITI Apps](https://github.com/khaouitiabdelhakim) | [LinkedIn](https://linkedin.com/in/khaouitiabdelhakim)

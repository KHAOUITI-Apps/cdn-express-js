/**
 * Copyright © KHAOUITI Apps 2025 | https://www.khaouitiapps.com/
 *
 * Author: KHAOUITI ABDELHAKIM (Software Engineer from ENSIAS)
 *
 * Any use, distribution, or modification of this code must be explicitly allowed by the owner.
 * For permissions, contact me or visit my LinkedIn:
 * https://www.linkedin.com/in/khaouitiabdelhakim/
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const MediaInfo = require('mediainfo.js').default;
const app = express();
const PORT = 3000;

// Secret key for HMAC signing
const SECRET_KEY = '6PEV9Kyiw_y9O7orH7UezgNgYedhWmjY2Kf_u1T-mKmR3S-gylF1ztsA-FA0j1LRvaagvflyVm14rVNWUF93l2B';

// Directory containing video files
const VIDEO_DIRECTORY = path.join(__dirname, '/videos');

// Middleware to get client IP
const getClientIp = (req) => {
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : req.connection.remoteAddress;
    return ip;
};

// Generate signed URL
const generateSignedUrl = (videoId, ipAddress) => {
    const expiryTime = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hour in seconds
    const data = `${videoId}:${expiryTime}:${ipAddress}`;
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(data);
    const token = hmac.digest('base64url');
    return `/api/stream/${videoId}?token=${token}&expires=${expiryTime}&ip=${ipAddress}`;
};

// Validate signed URL
const validateSignedUrl = (videoId, token, expires, ipAddress) => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp > expires) {
        console.log('Token has expired.');
        return false;
    }

    const data = `${videoId}:${expires}:${ipAddress}`;
    const hmac = crypto.createHmac('sha256', SECRET_KEY);
    hmac.update(data);
    const expectedToken = hmac.digest('base64url');

    console.log('Expected Token:', expectedToken);
    console.log('Received Token:', token);

    return expectedToken === token;
};

// Get metadata from video file using mediainfo.js
const getVideoMetadata = async (videoPath) => {
    try {
        const fileSize = fs.statSync(videoPath).size;
        const readChunk = (size, offset) =>
            new Promise((resolve, reject) => {
                const stream = fs.createReadStream(videoPath, { start: offset, end: offset + size - 1 });
                const chunks = [];
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('end', () => resolve(Buffer.concat(chunks)));
                stream.on('error', reject);
            });

        const mediaInfo = await MediaInfo({ format: 'object' });
        const result = await mediaInfo.analyzeData(() => fileSize, readChunk);

        const videoTrack = result.media.track.find((track) => track['@type'] === 'Video');
        const generalTrack = result.media.track.find((track) => track['@type'] === 'General');

        return {
            title: generalTrack?.Title || 'Unknown',
            author: generalTrack?.Performer || 'Unknown',
            topic: generalTrack?.Genre || 'Unknown',
            duration: generalTrack?.Duration || 0,
            resolution: videoTrack
                ? `${videoTrack.Width}x${videoTrack.Height}`
                : 'Unknown',
        };
    } catch (err) {
        console.error('Error reading video metadata:', err);
        return {
            title: 'Unknown',
            author: 'Unknown',
            topic: 'Unknown',
            duration: 0,
            resolution: 'Unknown',
        };
    }
};

// Get all videos with signed URLs
app.get('/api/videos', async (req, res) => {
    const clientIp = getClientIp(req);
    console.log('Client IP:', clientIp);

    try {
        const files = fs.readdirSync(VIDEO_DIRECTORY);
        const videos = [];

        for (const file of files) {
            if (file.endsWith('.mp4')) {
                const videoId = file.replace('.mp4', '');
                const videoPath = path.join(VIDEO_DIRECTORY, file);
                const signedUrl = generateSignedUrl(videoId, clientIp);

                // Get metadata from the video file
                const metadata = await getVideoMetadata(videoPath);

                videos.push({
                    id: videoId,
                    title: metadata.title,
                    author: metadata.author,
                    topic: metadata.topic,
                    duration: metadata.duration,
                    resolution: metadata.resolution,
                    url: signedUrl,
                });
            }
        }

        res.json(videos);
    } catch (err) {
        console.error('Error reading video directory:', err);
        res.status(500).json({ error: 'Unable to read video directory.' });
    }
});

// Stream video with signed URL validation
app.get('/api/stream/:videoId', (req, res) => {
    const { videoId } = req.params;
    const { token, expires, ip } = req.query;
    const clientIp = getClientIp(req);

    console.log('Incoming request to stream:', videoId);
    console.log('Token:', token);
    console.log('Expires:', expires);
    console.log('Extracted Client IP:', clientIp);

    if (!validateSignedUrl(videoId, token, parseInt(expires), clientIp)) {
        console.log('Invalid or expired token! Rejecting request.');
        return res.status(403).json({ error: 'Invalid or expired token. Access denied.' });
    }

    const videoPath = path.join(VIDEO_DIRECTORY, `${videoId}.mp4`);

    if (!fs.existsSync(videoPath)) {
        console.log('File not found:', videoPath);
        return res.status(404).json({ error: 'Requested video not found.' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        // Handle partial content (streaming)
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

        const chunkSize = end - start + 1;
        const file = fs.createReadStream(videoPath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4',
        };

        res.writeHead(206, head);
        file.pipe(res);
    } else {
        // Serve full video
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(videoPath).pipe(res);
    }
});

app.get('/', (req, res) => {
    res.send('CDN Express Js!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
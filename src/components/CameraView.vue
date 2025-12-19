<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Camera } from '@mediapipe/camera_utils';
import { Pose } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { ERGONOMICS_CONSTANTS } from '../utils/ergonomics';

const videoRef = ref(null);
const canvasRef = ref(null);
let camera = null;
let pose = null;

const onResults = (results) => {
  if (!canvasRef.value) return;
  const canvasCtx = canvasRef.value.getContext('2d');
  const w = canvasRef.value.width;
  const h = canvasRef.value.height;
  
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, w, h);
  
  // Draw the video frame
  canvasCtx.drawImage(results.image, 0, 0, w, h);
  
  // Draw Target Zone for Side View (Vertical Center Line as reference?)
  // For side view, we might want a vertical line to help them center the driver.
  const centerX = w * 0.5;
  
  canvasCtx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
  canvasCtx.lineWidth = 2;
  canvasCtx.setLineDash([10, 10]);
  canvasCtx.beginPath();
  canvasCtx.moveTo(centerX, 0);
  canvasCtx.lineTo(centerX, h);
  canvasCtx.stroke();
  canvasCtx.setLineDash([]);
  
  // Draw Text Label
  canvasCtx.fillStyle = '#4ade80';
  canvasCtx.font = '24px Inter, sans-serif';
  canvasCtx.fillText('운전자가 중앙에 오도록 맞추세요', centerX - 150, 40);

  if (results.poseLandmarks) {
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                   {color: '#00FF00', lineWidth: 4});
    drawLandmarks(canvasCtx, results.poseLandmarks,
                  {color: '#FF0000', lineWidth: 2});
    
    // Emit landmarks for analysis
    emit('pose-results', results.poseLandmarks);
  }
  canvasCtx.restore();
};

const emit = defineEmits(['pose-results']);

onMounted(async () => {
  if (videoRef.value && canvasRef.value) {
    pose = new Pose({locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
    }});
    
    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    pose.onResults(onResults);
    
    camera = new Camera(videoRef.value, {
      onFrame: async () => {
        await pose.send({image: videoRef.value});
      },
      width: 1280,
      height: 720
    });
    
    await camera.start();
  }
});

onUnmounted(() => {
  if (camera) camera.stop();
  if (pose) pose.close();
});
</script>

<template>
  <div class="camera-container">
    <video ref="videoRef" class="input_video" style="display: none;"></video>
    <canvas ref="canvasRef" width="1280" height="720" class="output_canvas"></canvas>
  </div>
</template>

<style scoped>
.camera-container {
  position: relative;
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
}

.output_canvas {
  width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
}
</style>

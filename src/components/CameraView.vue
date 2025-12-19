<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Camera } from '@mediapipe/camera_utils';
import { Pose } from '@mediapipe/pose';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { POSE_CONNECTIONS } from '@mediapipe/pose';
import { ERGONOMICS_CONSTANTS } from '../utils/ergonomics';

const props = defineProps({
  mode: {
    type: String,
    default: 'side' // 'front' or 'side'
  }
});
const emit = defineEmits(['pose-results']);

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
  
  if (props.mode === 'front') {
      // -- FRONT VIEW GUIDES --
      const minY = ERGONOMICS_CONSTANTS.EYE_LEVEL_MIN * h;
      const maxY = ERGONOMICS_CONSTANTS.EYE_LEVEL_MAX * h;
      
      canvasCtx.fillStyle = 'rgba(74, 222, 128, 0.2)';
      canvasCtx.fillRect(0, minY, w, maxY - minY);
      
      canvasCtx.strokeStyle = 'rgba(74, 222, 128, 0.8)';
      canvasCtx.lineWidth = 2;
      canvasCtx.setLineDash([5, 5]);
      canvasCtx.beginPath();
      canvasCtx.moveTo(0, minY);
      canvasCtx.lineTo(w, minY);
      canvasCtx.moveTo(0, maxY);
      canvasCtx.lineTo(w, maxY);
      canvasCtx.stroke();
      canvasCtx.setLineDash([]);
      
      canvasCtx.fillStyle = '#4ade80';
      canvasCtx.font = '24px Inter, sans-serif';
      canvasCtx.fillText('권장 눈 높이 영역', 20, minY - 10);
      
  } else {
      // -- SIDE VIEW GUIDES --
      const centerX = w * 0.5;
      
      canvasCtx.strokeStyle = 'rgba(74, 222, 128, 0.5)';
      canvasCtx.lineWidth = 2;
      canvasCtx.setLineDash([10, 10]);
      canvasCtx.beginPath();
      canvasCtx.moveTo(centerX, 0);
      canvasCtx.lineTo(centerX, h);
      canvasCtx.stroke();
      canvasCtx.setLineDash([]);
      
      canvasCtx.fillStyle = '#4ade80';
      canvasCtx.font = '24px Inter, sans-serif';
      canvasCtx.textAlign = 'center';
      canvasCtx.fillText('운전자를 중앙에 맞춰주세요', centerX, 40);
      canvasCtx.textAlign = 'start';
  }

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
  max-width: 100%; /* Allow full width */
  height: auto;
  aspect-ratio: 9/16; /* Suggest vertical ratio */
  margin: 0 auto;
  overflow: hidden;
  border-radius: 12px;
  background: #000;
}

.output_canvas {
  width: 100%;
  height: 100%; 
  object-fit: cover; /* Fill the container */
}
</style>

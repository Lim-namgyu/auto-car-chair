<script setup>
import CameraView from './components/CameraView.vue';
import { ref, computed } from 'vue';
import { analyzeDriverPose } from './utils/ergonomics';

const poseLandmarks = ref(null);
const analysisResult = ref(null);

const handlePoseResults = (landmarks) => {
  poseLandmarks.value = landmarks;
  analysisResult.value = analyzeDriverPose(landmarks);
};

const feedbackColor = computed(() => {
  if (!analysisResult.value) return '#888';
  const b = analysisResult.value.back.status === 'good';
  const k = analysisResult.value.knee.status === 'good';
  const e = analysisResult.value.elbow.status === 'good';
  const h = analysisResult.value.height.status === 'good';
  
  if (b && k && e && h) return '#4ade80'; // All good
  return '#f87171'; // Something needs adjustment
});
</script>

<template>
  <div class="app-container">
    <header>
      <h1>운전석 시트 조정 도우미</h1>
      <p class="subtitle">휴대폰을 대시보드에 고정하고 평소 운전 자세를 취해주세요.</p>
    </header>
    
    <main>
      <div class="camera-wrapper" :style="{ borderColor: feedbackColor }">
        <CameraView @pose-results="handlePoseResults" />
      </div>
      
      <div v-if="analysisResult" class="feedback-panel">
        <!-- Back Angle -->
        <div class="feedback-item" :class="analysisResult.back.status">
          <div class="header">
             <h3>등받이 각도</h3>
             <span class="value">{{ analysisResult.back.angle }}°</span>
          </div>
          <p>{{ analysisResult.back.feedback }}</p>
        </div>

        <!-- Knee Angle -->
        <div class="feedback-item" :class="analysisResult.knee.status">
          <div class="header">
             <h3>다리 간격 (무릎)</h3>
             <span class="value" v-if="analysisResult.knee.angle">{{ analysisResult.knee.angle }}°</span>
          </div>
          <p>{{ analysisResult.knee.feedback }}</p>
        </div>

        <!-- Hip Angle -->
        <div class="feedback-item" :class="analysisResult.hip.status">
          <div class="header">
             <h3>상체 각도 (엉덩이)</h3>
             <span class="value" v-if="analysisResult.hip.angle">{{ analysisResult.hip.angle }}°</span>
          </div>
          <p>{{ analysisResult.hip.feedback }}</p>
        </div>

        <!-- Elbow Angle -->
        <div class="feedback-item" :class="analysisResult.elbow.status">
          <div class="header">
             <h3>핸들 거리 (팔)</h3>
             <span class="value" v-if="analysisResult.elbow.angle">{{ analysisResult.elbow.angle }}°</span>
          </div>
          <p>{{ analysisResult.elbow.feedback }}</p>
        </div>

        <!-- Height -->
        <div class="feedback-item" :class="analysisResult.height.status">
          <div class="header">
             <h3>시트 높이</h3>
          </div>
          <p>{{ analysisResult.height.feedback }}</p>
        </div>
      </div>
      <div v-else class="status-panel">
        <p>운전자의 측면(전신)을 비춰주세요...</p>
      </div>
    </main>
  </div>
</template>

<style scoped>
.app-container {
  max-width: 800px;
  margin: 0 auto;
  min-height: 100vh;
  padding: 2rem;
  box-sizing: border-box;
  text-align: center;
}

.camera-wrapper {
  border: 4px solid #444;
  border-radius: 16px;
  overflow: hidden;
  transition: border-color 0.3s ease;
  margin-bottom: 2rem;
}

.feedback-panel {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.feedback-item {
  background: #2a2a2a;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid #444;
  text-align: left;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.value {
  font-weight: bold;
  font-family: monospace;
  background: rgba(0,0,0,0.3);
  padding: 2px 6px;
  border-radius: 4px;
}

.feedback-item h3 {
  margin: 0;
  color: #aaa;
  font-size: 1rem;
}

.feedback-item p {
  margin: 0;
  font-size: 0.9rem;
  color: #ddd;
}

/* Good Status */
.feedback-item.good {
  border-color: #4ade80;
  background: rgba(74, 222, 128, 0.1);
}
.feedback-item.good h3, .feedback-item.good .value { color: #4ade80; }

/* Warning Statuses */
.feedback-item.too_upright, .feedback-item.too_reclined,
.feedback-item.too_bent, .feedback-item.too_straight,
.feedback-item.too_closed, .feedback-item.too_open,
.feedback-item.too_high, .feedback-item.too_high_head,
.feedback-item.too_close, .feedback-item.too_far {
  border-color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}
.feedback-item.too_upright h3, .feedback-item.too_reclined h3,
.feedback-item.too_bent h3, .feedback-item.too_straight h3,
.feedback-item.too_closed h3, .feedback-item.too_open h3,
.feedback-item.too_high h3, .feedback-item.too_high_head h3,
.feedback-item.too_close h3, .feedback-item.too_far h3 { color: #f87171; }


header {
  margin-bottom: 2rem;
}

h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: linear-gradient(to right, #4facfe 0%, #00f2fe 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.subtitle {
  color: #888;
}

.status-panel {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}
</style>

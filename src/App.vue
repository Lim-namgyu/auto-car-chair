<script setup>
import CameraView from './components/CameraView.vue';
import { ref, computed } from 'vue';
import { analyzeDriverPose } from './utils/ergonomics';

const currentMode = ref('side'); // 'side' (default) or 'front'
const poseLandmarks = ref(null);
const analysisResult = ref(null);

const handlePoseResults = (landmarks) => {
  poseLandmarks.value = landmarks;
  analysisResult.value = analyzeDriverPose(landmarks, currentMode.value);
};

const setMode = (mode) => {
  currentMode.value = mode;
  analysisResult.value = null; // Reset results on switch
  poseLandmarks.value = null;
};

const overallStatus = computed(() => {
  if (!analysisResult.value) return 'neutral';
  
  if (currentMode.value === 'front') {
      const h = analysisResult.value.height.status === 'good';
      const d = analysisResult.value.distance.status === 'good';
      return (h && d) ? 'good' : 'bad';
  } else {
      const b = analysisResult.value.back.status === 'good';
      const hip = analysisResult.value.hip ? analysisResult.value.hip.status === 'good' : true;
      const e = analysisResult.value.elbow.status === 'good';
      const h = analysisResult.value.height.status === 'good';
      // Knee removed
      
      return (b && hip && e && h) ? 'good' : 'bad';
  }
});

const overallMessage = computed(() => {
  if (!analysisResult.value) return '분석 중...';
  if (overallStatus.value === 'good') return '완벽한 자세입니다! ✨';
  return '자세 조정이 필요합니다 🔧';
});


</script>

<template>
  <div class="app-container">
    <!-- Floating Header -->
    <header class="glass-header">
      <h1>Seat Fit</h1>
      
      <!-- Segmented Control for Mode -->
      <div class="mode-switch-container">
        <div class="mode-switch">
          <button 
            :class="{ active: currentMode === 'side' }" 
            @click="setMode('side')"
          >
            측면 (보조석)
          </button>
          <button 
            :class="{ active: currentMode === 'front' }" 
            @click="setMode('front')"
          >
            정면 (대시보드)
          </button>
          <div class="switch-bg" :class="currentMode"></div>
        </div>
      </div>
    </header>
    
    <main>
      <div class="content-wrapper">
        <!-- Camera Section -->
        <div class="camera-card" :class="overallStatus">
          <CameraView :mode="currentMode" @pose-results="handlePoseResults" />
          
          <!-- Mode Guidance Overlay -->
          <div class="guide-overlay">
            <p v-if="currentMode === 'side'">운전자의 <span class="highlight">측면 전신</span>을 비춰주세요</p>
            <p v-else>운전자의 <span class="highlight">정면 얼굴/상체</span>를 비춰주세요</p>
          </div>
        </div>
        
        <!-- Feedback Sheet -->
        <div class="feedback-sheet" :class="{ 'has-results': analysisResult }">
          <div class="sheet-handle"></div>
          
          <div v-if="analysisResult" class="feedback-content">
            <div class="status-summary">
               <span class="status-icon" :class="overallStatus"></span>
               <h2>{{ overallMessage }}</h2>
            </div>
            
            <div class="feedback-grid">
              <!-- FRONT MODE FEEDBACK -->
              <template v-if="currentMode === 'front'">
                  <div class="feedback-card" :class="analysisResult.height.status">
                    <div class="card-icon">👁️</div>
                    <div class="card-info">
                      <h3>눈 높이</h3>
                      <p>{{ analysisResult.height.feedback }}</p>
                    </div>
                  </div>
                  <div class="feedback-card" :class="analysisResult.distance.status">
                    <div class="card-icon">💪</div>
                    <div class="card-info">
                      <div class="card-header">
                        <h3>팔 거리</h3>
                        <span class="value">{{ analysisResult.distance.angle }}°</span>
                      </div>
                      <p>{{ analysisResult.distance.feedback }}</p>
                    </div>
                  </div>
              </template>

              <!-- SIDE MODE FEEDBACK -->
              <template v-else>
                  <!-- Back Angle -->
                  <div class="feedback-card" :class="analysisResult.back.status">
                    <div class="card-icon">💺</div>
                    <div class="card-info">
                      <div class="card-header">
                        <h3>등받이</h3>
                        <span class="value">{{ analysisResult.back.angle }}°</span>
                      </div>
                      <p>{{ analysisResult.back.feedback }}</p>
                    </div>
                  </div>
          
                  <!-- Hip Angle -->
                  <div class="feedback-card" :class="analysisResult.hip.status">
                    <div class="card-icon">📐</div>
                    <div class="card-info">
                      <div class="card-header">
                        <h3>상체/엉덩이</h3>
                        <span class="value" v-if="analysisResult.hip.angle">{{ analysisResult.hip.angle }}°</span>
                      </div>
                      <p>{{ analysisResult.hip.feedback }}</p>
                    </div>
                  </div>
          
                  <!-- Elbow Angle -->
                  <div class="feedback-card" :class="analysisResult.elbow.status">
                    <div class="card-icon">💪</div>
                    <div class="card-info">
                      <div class="card-header">
                        <h3>팔 거리</h3>
                        <span class="value" v-if="analysisResult.elbow.angle">{{ analysisResult.elbow.angle }}°</span>
                      </div>
                      <p>{{ analysisResult.elbow.feedback }}</p>
                    </div>
                  </div>
          
                  <!-- Height -->
                  <div class="feedback-card" :class="analysisResult.height.status">
                    <div class="card-icon">↕️</div>
                    <div class="card-info">
                      <h3>시트 높이</h3>
                      <p>{{ analysisResult.height.feedback }}</p>
                    </div>
                  </div>
              </template>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <div class="loader"></div>
            <p>자세를 분석하고 있습니다...</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Reset & Base */
.app-container {
  font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: #0f172a; /* Slate 900 */
  color: #f8fafc;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Glass Header */
.glass-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: 1.5rem 1rem 0.5rem;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.8) 0%, rgba(15, 23, 42, 0) 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

h1 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: #fff;
  margin: 0;
  text-transform: uppercase;
}

/* Segmented Control */
.mode-switch-container {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px;
  border-radius: 9999px;
  backdrop-filter: blur(8px);
}

.mode-switch {
  position: relative;
  display: flex;
  height: 36px;
}

.mode-switch button {
  position: relative;
  z-index: 2;
  flex: 1;
  padding: 0 1.5rem;
  border: none;
  background: none;
  color: #94a3b8;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.3s ease;
}

.mode-switch button.active {
  color: #fff;
}

.switch-bg {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  background: #3b82f6; /* Blue 500 */
  border-radius: 9999px;
  z-index: 1;
  transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.switch-bg.side { transform: translateX(0); }
.switch-bg.front { transform: translateX(100%); width: 50%; } /* Assuming 2 buttons roughly equal */


/* Main Content */
main {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.content-wrapper {
  flex: 1;
  position: relative;
}

.camera-card {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  transition: all 0.5s ease;
}

.camera-card.good { box-shadow: inset 0 0 50px rgba(74, 222, 128, 0.2); }
.camera-card.bad { box-shadow: inset 0 0 50px rgba(248, 113, 113, 0.2); }

.guide-overlay {
  position: absolute;
  top: 100px; /* Below header */
  left: 0;
  right: 0;
  text-align: center;
  pointer-events: none;
}

.guide-overlay p {
  background: rgba(0, 0, 0, 0.5);
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  backdrop-filter: blur(4px);
  color: rgba(255, 255, 255, 0.9);
}

.highlight {
  color: #4ade80;
  font-weight: 600;
}

/* Feedback Sheet */
.feedback-sheet {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(20px);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: 1rem 1.5rem 2rem;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
  transition: transform 0.3s ease;
  max-height: 45vh;
  overflow-y: auto;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.sheet-handle {
  width: 40px;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  margin: 0 auto 1.5rem;
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.status-icon {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}
.status-icon.good { background: #4ade80; box-shadow: 0 0 10px #4ade80; }
.status-icon.bad { background: #f87171; box-shadow: 0 0 10px #f87171; }
.status-icon.neutral { background: #94a3b8; }

.status-summary h2 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
}

/* Feedback Grid */
.feedback-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.feedback-card {
  background: rgba(255,255,255,0.05);
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.3s ease;
}

.feedback-card.good { background: rgba(74, 222, 128, 0.1); border-color: rgba(74, 222, 128, 0.2); }
.feedback-card.too_upright, .feedback-card.too_reclined, 
.feedback-card.too_bent, .feedback-card.too_straight, 
.feedback-card.too_closed, .feedback-card.too_open, 
.feedback-card.too_high, .feedback-card.too_high_head, 
.feedback-card.too_close, .feedback-card.too_far {
  background: rgba(248, 113, 113, 0.1);
  border-color: rgba(248, 113, 113, 0.2);
}

.card-icon {
  font-size: 1.5rem;
  padding-top: 0.2rem;
}

.card-info {
  flex: 1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.card-info h3 {
  margin: 0 0 0.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: #e2e8f0;
}

.value {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 0.9rem;
  color: #94a3b8;
}

.card-info p {
  margin: 0;
  font-size: 0.85rem;
  color: #cbd5e1;
  line-height: 1.4;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 2rem 0;
  color: #64748b;
}
.loader {
  border: 3px solid rgba(255,255,255,0.1);
  border-radius: 50%;
  border-top: 3px solid #3b82f6;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin: 0 auto 0.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
```

<script setup>
import CameraView from './components/CameraView.vue';
import { ref, computed } from 'vue';
import { analyzeDriverPose } from './utils/ergonomics';

const currentMode = ref('side'); // 'side' (default) or 'front'
const showGuide = ref(false);
const poseLandmarks = ref(null);
const analysisResult = ref(null);

const toggleGuide = () => {
  showGuide.value = !showGuide.value;
};

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
      
      <button class="help-btn" @click="toggleGuide">?</button>
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
                      <h3>팔 거리</h3>
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
                      <h3>등받이</h3>
                      <p>{{ analysisResult.back.feedback }}</p>
                    </div>
                  </div>
          
                  <!-- Hip Angle -->
                  <div class="feedback-card" :class="analysisResult.hip.status">
                    <div class="card-icon">📐</div>
                    <div class="card-info">
                      <h3>상체/엉덩이</h3>
                      <p>{{ analysisResult.hip.feedback }}</p>
                    </div>
                  </div>
          
                  <!-- Elbow Angle -->
                  <div class="feedback-card" :class="analysisResult.elbow.status">
                    <div class="card-icon">💪</div>
                    <div class="card-info">
                      <h3>팔 거리</h3>
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
      <!-- Guide Modal -->
      <div v-if="showGuide" class="guide-modal-overlay" @click.self="toggleGuide">
        <div class="guide-modal">
          <button class="close-btn" @click="toggleGuide">×</button>
          
          <div class="guide-content">
            <h2>{{ currentMode === 'side' ? '측면 측정 가이드' : '정면 측정 가이드' }}</h2>
            
            <div class="guide-image-container">
             <!-- Using placeholders as assets are not generated -->
              <img v-if="currentMode === 'side'" src="https://placehold.co/600x337/1e293b/4ade80/png?text=Side+View+Guide" alt="Side View Guide" />
              <img v-else src="https://placehold.co/600x337/1e293b/4ade80/png?text=Front+View+Guide" alt="Front View Guide" />
            </div>
            
            <div class="guide-steps">
              <template v-if="currentMode === 'side'">
                <div class="step">
                  <span class="step-num">1</span>
                  <p>휴대폰을 <strong>보조석 시트</strong> 위나 도어 쪽 거치대에 놓아주세요.</p>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <p>운전자의 <strong>머리부터 엉덩이까지</strong> 전신이 잘 보이도록 각도를 조절하세요.</p>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <p>평소 운전하는 자세로 앉아 핸들을 잡아주세요.</p>
                </div>
              </template>
              <template v-else>
                <div class="step">
                  <span class="step-num">1</span>
                  <p>휴대폰을 <strong>대시보드(계기판 앞)</strong>에 안정적으로 거치하세요.</p>
                </div>
                <div class="step">
                  <span class="step-num">2</span>
                  <p>운전자의 <strong>얼굴과 어깨</strong>가 화면 중앙에 오도록 맞추세요.</p>
                </div>
                <div class="step">
                  <span class="step-num">3</span>
                  <p>정면을 응시하며 편안한 자세를 취해주세요.</p>
                </div>
              </template>
            </div>
            
            <button class="action-btn" @click="toggleGuide">확인했어요</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Guide Modal */
.guide-modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(5px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  animation: fadeIn 0.3s ease;
}

.guide-modal {
  background: #1e293b;
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  position: relative;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
  overflow: hidden;
  animation: slideUp 0.3s ease;
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0.5rem;
  z-index: 10;
}

.guide-content {
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.guide-content h2 {
  font-size: 1.5rem;
  color: #fff;
  margin: 0 0 1.5rem;
  text-align: center;
}

.guide-image-container {
  width: 100%;
  aspect-ratio: 16/9;
  background: #0f172a;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.guide-image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  margin-bottom: 2rem;
}

.step {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  text-align: left;
}

.step-num {
  background: #3b82f6;
  color: #fff;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: bold;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.step p {
  margin: 0;
  font-size: 0.95rem;
  color: #cbd5e1;
  line-height: 1.5;
}

.action-btn {
  background: #3b82f6;
  color: #fff;
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #2563eb;
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

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

.help-btn {
  position: absolute;
  right: 1.5rem;
  top: 1.5rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(4px);
  padding: 0;
  font-size: 1rem;
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
  background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(20px);
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 1rem 1rem 1.5rem;
  box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
  transition: transform 0.3s ease;
  max-height: 50vh;
  overflow-y: auto;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.sheet-handle {
  width: 36px;
  height: 4px;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  margin: 0 auto 1rem;
}

.status-summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.status-icon {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.status-icon.good { background: #4ade80; box-shadow: 0 0 8px #4ade80; }
.status-icon.bad { background: #f87171; box-shadow: 0 0 8px #f87171; }
.status-icon.neutral { background: #94a3b8; }

.status-summary h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
}

/* Feedback Grid */
.feedback-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* Two columns for compactness */
  gap: 0.5rem;
}

.feedback-card {
  background: rgba(255,255,255,0.03);
  border-radius: 12px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column; /* Stack icon and text for better 2-col fit */
  align-items: flex-start;
  gap: 0.5rem;
  border: 1px solid rgba(255,255,255,0.05);
  transition: all 0.3s ease;
}

.feedback-card.good { background: rgba(74, 222, 128, 0.08); border-color: rgba(74, 222, 128, 0.15); }
.feedback-card.too_upright, .feedback-card.too_reclined, 
.feedback-card.too_bent, .feedback-card.too_straight, 
.feedback-card.too_closed, .feedback-card.too_open, 
.feedback-card.too_high, .feedback-card.too_high_head, 
.feedback-card.too_close, .feedback-card.too_far {
  background: rgba(248, 113, 113, 0.08);
  border-color: rgba(248, 113, 113, 0.15);
}

.card-icon {
  font-size: 1.25rem;
}

.card-info {
  width: 100%;
}

.card-info h3 {
  margin: 0 0 0.15rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #e2e8f0;
}

.card-info p {
  margin: 0;
  font-size: 0.75rem;
  color: #cbd5e1;
  line-height: 1.3;
  /* limit lines if needed */
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


/**
 * Calculates the angle between three points (a, b, c).
 * @param {object} a - Point A {x, y, z}
 * @param {object} b - Point B {x, y, z} (vertex)
 * @param {object} c - Point C {x, y, z}
 * @returns {number} Angle in degrees
 */
export function calculateAngle(a, b, c) {
    if (!a || !b || !c) return 0;
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
}

/**
 * Calculates the angle of a line segment relative to the vertical axis.
 * @param {object} top - Top point
 * @param {object} bottom - Bottom point
 * @returns {number} Angle in degrees from vertical (0 is straight up)
 */
export function calculateVerticalAngle(top, bottom) {
    if (!top || !bottom) return 0;
    const dx = top.x - bottom.x;
    const dy = top.y - bottom.y;
    // Let's use 3-point angle with a virtual point directly above the bottom point
    const virtualTop = { x: bottom.x, y: bottom.y - 0.5 };
    return calculateAngle(top, bottom, virtualTop);
}


export const ERGONOMICS_CONSTANTS = {
    EYE_LEVEL_MIN: 0.25,
    EYE_LEVEL_MAX: 0.6,
    SIDE_VIEW_GUIDE_X: 0.5
};

/**
 * Analyzes the driver's pose.
 * @param {Array} landmarks - MediaPipe Pose landmarks
 * @param {string} mode - 'front' (dashboard) or 'side' (passenger seat)
 * @returns {object} Analysis result
 */
export function analyzeDriverPose(landmarks, mode = 'side') {
    if (!landmarks) return null;

    // Landmarks Map
    const nose = landmarks[0];
    const leftEye = landmarks[2];
    const rightEye = landmarks[5];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];

    const minVisibility = 0.5;

    if (mode === 'front') {
        // --- FRONT VIEW LOGIC ---
        // 1. Height Analysis (Eye Level)
        const avgEyeY = (leftEye.y + rightEye.y) / 2;
        let heightStatus = 'good';
        let heightFeedback = '높이가 적절합니다.';

        if (avgEyeY > ERGONOMICS_CONSTANTS.EYE_LEVEL_MAX) {
            heightStatus = 'too_low';
            heightFeedback = '시트를 높여주세요.';
        } else if (avgEyeY < ERGONOMICS_CONSTANTS.EYE_LEVEL_MIN) {
            heightStatus = 'too_high';
            heightFeedback = '시트를 낮춰주세요.';
        }

        // 2. Distance Analysis (Elbow Angle if visible)
        // Similar to Side view but less reliable from front due to occlusion.
        let distanceStatus = 'unknown';
        let distanceFeedback = '운전대를 잡아주세요.';
        let elbowAngle = 0;

        // Use average of both arms or whichever is visible
        const leftVisible = leftElbow.visibility > minVisibility && leftWrist.visibility > minVisibility;
        const rightVisible = rightElbow.visibility > minVisibility && rightWrist.visibility > minVisibility;

        if (leftVisible || rightVisible) {
            const lAngle = leftVisible ? calculateAngle(leftShoulder, leftElbow, leftWrist) : 0;
            const rAngle = rightVisible ? calculateAngle(rightShoulder, rightElbow, rightWrist) : 0;

            if (leftVisible && rightVisible) elbowAngle = (lAngle + rAngle) / 2;
            else elbowAngle = leftVisible ? lAngle : rAngle;

            // Front view foreshortening affects angle calculation significantly.
            // Target range might need to be wider or adjusted.
            // Let's stick to standard 100-140 guidelines but be lenient.

            if (elbowAngle < 90) {
                distanceStatus = 'too_close';
                distanceFeedback = '시트를 뒤로 이동하세요 (팔이 너무 굽혀짐).';
            } else if (elbowAngle > 150) {
                distanceStatus = 'too_far';
                distanceFeedback = '시트를 앞으로 당기세요 (팔이 너무 펴짐).';
            } else {
                distanceStatus = 'good';
                distanceFeedback = '거리가 적절합니다.';
            }
        }

        return {
            mode: 'front',
            height: { status: heightStatus, feedback: heightFeedback, value: avgEyeY },
            distance: { status: distanceStatus, feedback: distanceFeedback, angle: Math.round(elbowAngle) },
            timestamp: Date.now()
        };

    } else {
        // --- SIDE VIEW LOGIC ---
        // Determine side
        let isRightSide = true;
        if (leftHip.visibility > rightHip.visibility + 0.2) {
            isRightSide = false;
        }

        const shoulder = isRightSide ? rightShoulder : leftShoulder;
        const hip = isRightSide ? rightHip : leftHip;
        const knee = isRightSide ? rightKnee : leftKnee;
        const ankle = isRightSide ? rightAnkle : leftAnkle;
        const elbow = isRightSide ? rightElbow : leftElbow;
        const wrist = isRightSide ? rightWrist : leftWrist;

        const isBodyVisible = shoulder.visibility > minVisibility && hip.visibility > minVisibility && knee.visibility > minVisibility;

        if (!isBodyVisible) return null;

        // 1. Back Angle
        const backAngle = calculateVerticalAngle(shoulder, hip);
        let backStatus = 'good';
        let backFeedback = '등받이 각도가 좋습니다.';
        if (backAngle < 5) {
            backStatus = 'too_upright';
            backFeedback = '등받이를 조금 눕혀주세요.';
        } else if (backAngle > 30) {
            backStatus = 'too_reclined';
            backFeedback = '등받이를 세워주세요.';
        }

        // 2. Knee Angle - REMOVED per user request
        // "다리 간격은 필요없지 않아?" -> Removed.
        let kneeStatus = 'unknown';
        let kneeFeedback = '';
        let kneeAngle = 0;

        // 3. Hip Angle
        let hipAngleStatus = 'unknown';
        let hipAngleFeedback = '엉덩이 각도 분석 불가';
        let hipAngleVal = 0;
        if (hip.visibility > minVisibility && knee.visibility > minVisibility) {
            hipAngleVal = calculateAngle(shoulder, hip, knee);
            if (hipAngleVal < 90) {
                hipAngleStatus = 'too_closed';
                hipAngleFeedback = '자세가 너무 웅크려졌습니다. 등받이를 눕히거나 엉덩이를 깊숙이 넣으세요.';
            } else if (hipAngleVal > 115) {
                hipAngleStatus = 'too_open';
                hipAngleFeedback = '자세가 너무 펴졌습니다.';
            } else {
                hipAngleStatus = 'good';
                hipAngleFeedback = '상체와 다리 각도가 안정적입니다.';
            }
        }

        // 4. Elbow Angle
        let elbowStatus = 'unknown';
        let elbowFeedback = '팔이 잘 보이지 않습니다.';
        let elbowAngle = 0;
        if (elbow.visibility > minVisibility && wrist.visibility > minVisibility) {
            elbowAngle = calculateAngle(shoulder, elbow, wrist);
            if (elbowAngle < 90) {
                elbowStatus = 'too_bent';
                elbowFeedback = '핸들과 너무 가깝습니다.';
            } else if (elbowAngle > 145) {
                elbowStatus = 'too_straight';
                elbowFeedback = '핸들이 너무 멉니다.';
            } else {
                elbowStatus = 'good';
                elbowFeedback = '팔 각도가 적절합니다.';
            }
        }

        // 5. Height (Hip relative to Knee)
        let heightStatus = 'good';
        let heightFeedback = '시트 높이가 적절합니다.';
        const heightDiff = hip.y - knee.y;
        if (heightDiff < -0.05) {
            heightStatus = 'too_high';
            heightFeedback = '시트를 낮춰 엉덩이를 무릎보다 낮게 하세요.';
        }
        if (nose.visibility > minVisibility && nose.y < 0.1) {
            heightStatus = 'too_high_head';
            heightFeedback = '머리 공간이 부족합니다. 시트를 낮추세요.';
        }

        return {
            mode: 'side',
            back: { status: backStatus, feedback: backFeedback, angle: Math.round(backAngle) },
            knee: { status: kneeStatus, feedback: kneeFeedback, angle: Math.round(kneeAngle) },
            hip: { status: hipAngleStatus, feedback: hipAngleFeedback, angle: Math.round(hipAngleVal) },
            elbow: { status: elbowStatus, feedback: elbowFeedback, angle: Math.round(elbowAngle) },
            height: { status: heightStatus, feedback: heightFeedback },
            isRightSide,
            timestamp: Date.now()
        };
    }
}

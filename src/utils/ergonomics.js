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
    // Vector
    const dx = top.x - bottom.x;
    const dy = top.y - bottom.y;
    // Angle with Y axis (0, -1)
    // atan2(x, y) gives angle from Y axis in some conventions, let's stick to standard math
    // Vertical vector V = (0, -1) (up).
    // Dot product: A . B = |A||B|cos(theta)
    // We want angle of torso tilt. 
    // Simpler: Just atan2
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    // Normalize to vertical = 0 or 90
    // Let's return angle from vertical upright.
    // If upright, top is directly above bottom. x is same, top.y < bottom.y.
    // angle will be -90.
    // We want magnitude of lean.

    // Let's use 3-point angle with a virtual point directly above the bottom point
    const virtualTop = { x: bottom.x, y: bottom.y - 0.5 };
    return calculateAngle(top, bottom, virtualTop);
}


export const ERGONOMICS_CONSTANTS = {
    // Side view constants can be added here if needed for drawing
    SIDE_VIEW_GUIDE_X: 0.5
};

/**
 * Analyzes the driver's pose for seat adjustment (Side View).
 * @param {Array} landmarks - MediaPipe Pose landmarks
 * @returns {object} Analysis result
 */
export function analyzeDriverPose(landmarks) {
    if (!landmarks) return null;

    // Landmarks
    // 11: left_shoulder, 12: right_shoulder
    // 23: left_hip, 24: right_hip
    // 25: left_knee, 26: right_knee
    // 27: left_ankle, 28: right_ankle
    // 13: left_elbow, 14: right_elbow
    // 15: left_wrist, 16: right_wrist
    // 0: nose (for head clearance)

    // Determine which side is facing the camera.
    // "Passenger seat" -> Camera looks at driver's RIGHT side (if LHD car) or LEFT (if RHD).
    // Assuming LHD (Korea), passenger is on right, camera looks at Driver's RIGHT profile.
    // We should pick the set of landmarks that are more visible or consistently assume Right side.
    // Let's check visibility.

    const leftHip = landmarks[23];
    const rightHip = landmarks[24];

    // Use the side with higher visibility or default to Right for Korea (Passenger seat is on right)
    // Actually, if I sit in passenger seat and look at driver, I see their RIGHT profile.
    let isRightSide = true;
    if (leftHip.visibility > rightHip.visibility + 0.2) {
        isRightSide = false; // Driver might be in RHD car or cam is on other side
    }

    const shoulder = isRightSide ? landmarks[12] : landmarks[11];
    const hip = isRightSide ? landmarks[24] : landmarks[23];
    const knee = isRightSide ? landmarks[26] : landmarks[25];
    const ankle = isRightSide ? landmarks[28] : landmarks[27];
    const elbow = isRightSide ? landmarks[14] : landmarks[13];
    const wrist = isRightSide ? landmarks[16] : landmarks[15];
    const nose = landmarks[0];

    const minVisibility = 0.5;
    const isBodyVisible = shoulder.visibility > minVisibility && hip.visibility > minVisibility && knee.visibility > minVisibility;

    if (!isBodyVisible) {
        return null; // Not enough points to analyze
    }

    // 1. Back Angle (Torso Recline)
    // Vertical line from Hip upwards vs Hip-Shoulder line
    const backAngle = calculateVerticalAngle(shoulder, hip);
    let backStatus = 'good';
    let backFeedback = '등받이 각도가 좋습니다.';

    // Target: 100-110 degrees from vertical is comfortable reclined? 
    // Wait, calculateVerticalAngle returns angle between (Shoulder-Hip) and (Up-Hip).
    // If perfectly upright, angle is 0. 
    // Reclined means angle > 0.
    // Normal driving position is slightly reclined, approx 10-25 degrees back from vertical.
    // So angle should be around 10-25 deg? 
    // Let's assume standard seat back angle measure: 90 is vertical, 100-110 is good.
    // If my calc returns 0 for upright, then 10-20 is good.

    // Correction: Standard "Seat Back Angle" usually refers to angle between Seat Pan and Seat Back.
    // But we don't know Seat Pan angle easily.
    // Let's use Torso angle relative to Gravity (Vertical).
    // Vertical = 0 deg. Comfortable driving is ~10-25 deg recline.

    if (backAngle < 5) {
        backStatus = 'too_upright';
        backFeedback = '등받이를 조금 눕혀주세요.';
    } else if (backAngle > 30) {
        backStatus = 'too_reclined';
        backFeedback = '등받이를 세워주세요.';
    }

    // 2. Knee Angle (Hip-Knee-Ankle)
    let kneeStatus = 'unknown';
    let kneeFeedback = '다리가 잘 보이지 않습니다.';
    let kneeAngle = 0;

    if (ankle.visibility > minVisibility) {
        kneeAngle = calculateAngle(hip, knee, ankle);
        // Target: 120 approx (110-130)
        if (kneeAngle < 100) {
            kneeStatus = 'too_bent';
            kneeFeedback = '시트를 뒤로 이동하세요 (무릎이 너무 굽혀짐).';
        } else if (kneeAngle > 140) {
            kneeStatus = 'too_straight';
            kneeFeedback = '시트를 앞으로 당기세요 (무릎이 너무 펴짐).';
        } else {
            kneeStatus = 'good';
            kneeFeedback = '무릎 각도가 적절합니다.';
        }
    }

    // 3. Hip Angle (Shoulder-Hip-Knee) - Torso vs Thigh
    // Helps determine if the seat bottom angle is correct relative to backrest.
    let hipAngleStatus = 'unknown';
    let hipAngleFeedback = '엉덩이 각도 분석 불가';
    let hipAngleVal = 0;

    if (hip.visibility > minVisibility && knee.visibility > minVisibility) {
        hipAngleVal = calculateAngle(shoulder, hip, knee);
        // Target: 90 - 110 degrees. 
        // < 90: Too closed (cramped). > 115: Too open (sliding out).
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

    // 4. Elbow Angle (Shoulder-Elbow-Wrist)
    let elbowStatus = 'unknown';
    let elbowFeedback = '팔이 잘 보이지 않습니다.';
    let elbowAngle = 0;

    if (elbow.visibility > minVisibility && wrist.visibility > minVisibility) {
        elbowAngle = calculateAngle(shoulder, elbow, wrist);
        // Target: 100-130 approx
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

    // 5. Height (Hip vs Knee)
    // Check if thighs are roughly horizontal or hip slightly lower.
    // y increases downwards.
    // If hip.y > knee.y => Hip is lower than knee (Good).
    // If hip.y < knee.y - threshold => Hip is significantly higher than knee (Seat too high).
    let heightStatus = 'good';
    let heightFeedback = '시트 높이가 적절합니다.';

    // Normalizing by scale is hard without depth, but we can check relative slope.
    // If Hip is > 10% of body height higher than knee?
    // Let's just compare raw Ys.
    // Warning: Camera tilt affects this. Assuming horizontal camera.

    const heightDiff = hip.y - knee.y; // Positive if Hip is lower
    if (heightDiff < -0.05) { // Hip is higher by > 5% screen height
        heightStatus = 'too_high';
        heightFeedback = '시트를 낮춰 엉덩이를 무릎보다 낮게 하세요.';
    }

    // Head Clearance
    // Nose should not be too close to top of frame
    if (nose.visibility > minVisibility && nose.y < 0.1) {
        heightStatus = 'too_high_head';
        heightFeedback = '머리 공간이 부족합니다. 시트를 낮추세요.';
    }

    return {
        back: { status: backStatus, feedback: backFeedback, angle: Math.round(backAngle) },
        knee: { status: kneeStatus, feedback: kneeFeedback, angle: Math.round(kneeAngle) },
        hip: { status: hipAngleStatus, feedback: hipAngleFeedback, angle: Math.round(hipAngleVal) },
        elbow: { status: elbowStatus, feedback: elbowFeedback, angle: Math.round(elbowAngle) },
        height: { status: heightStatus, feedback: heightFeedback },
        isRightSide,
        timestamp: Date.now()
    };
}

// BWF 서비스 규정 상수
export const BWF = {
    SERVICE_HEIGHT_LIMIT: 1.15,
    PERFECT_THRESHOLD: 1.10,
    FAULT_THRESHOLD: 1.15,
    NET_POST_HEIGHT: 1.55,
};

export const VERDICT = {
    PERFECT: 'PERFECT',
    FAULT: 'FAULT',
    VAR_CHALLENGE: 'VAR_CHALLENGE',
};

export const POSE_KEYPOINTS = {
    NOSE: 0,
    LEFT_SHOULDER: 11, RIGHT_SHOULDER: 12,
    LEFT_ELBOW: 13, RIGHT_ELBOW: 14,
    LEFT_WRIST: 15, RIGHT_WRIST: 16,
    LEFT_HIP: 23, RIGHT_HIP: 24,
    LEFT_KNEE: 25, RIGHT_KNEE: 26,
    LEFT_ANKLE: 27, RIGHT_ANKLE: 28,
};

export const SHUTTLE_DETECT = {
    ROI_RADIUS: 150,
    MIN_BRIGHTNESS: 200,
    MAX_SATURATION: 30,
    MIN_BLOB_SIZE: 15,
    MAX_BLOB_SIZE: 600,
};

export const IMPACT_DETECT = {
    VELOCITY_DROP_RATIO: 0.4,
    WINDOW_BEFORE: 5,
    WINDOW_AFTER: 5,
    MIN_VELOCITY: 5,
};

export const SHORTFORM = {
    DURATION_SECONDS: 15,
    FPS: 30,
    WATERMARK_TEXT: '🏸 NoMoreFault - BWF 폴트 판독',
    FREEZE_FRAMES: 30,
    ZOOM_FACTOR: 2.0,
};

export const ROUTES = {
    HOME: '/',
    LOADING: '/loading',
    RESULT: '/result',
    COMPARE: '/compare',
    SHARE: '/share',
    CAMERA: '/camera',
    ANALYSIS: '/analysis',
};

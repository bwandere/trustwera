// Procedural 3D Bust Icons for How It Works Section — Progressive Enhancement
(function() {
    'use strict';

    /**
     * Feature detection for WebGL support (actual context creation).
     */
    function isWebGLSupported() {
        try {
            const testCanvas = document.createElement('canvas');
            return Boolean(
                window.WebGLRenderingContext &&
                (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl'))
            );
        } catch (e) {
            return false;
        }
    }

    /**
     * Check if user prefers reduced motion.
     */
    function prefersReducedMotion() {
        return Boolean(
            window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
        );
    }

    // Precondition check: if WebGL is unsupported OR reduced motion is preferred,
    // do nothing — leave circles as plain solid-color with number badge.
    if (!isWebGLSupported() || prefersReducedMotion()) {
        return;
    }

    // DOM Elements
    const section = document.querySelector('.how-it-works');
    const canvases = document.querySelectorAll('.timeline__marker .timeline__canvas');

    if (!section || canvases.length !== 3) {
        return;
    }

    if (!('IntersectionObserver' in window)) {
        return;
    }

    // Preserved site color palette
    const PALETTE = {
        primary: 0x1E3A8A,     // #1E3A8A
        secondary: 0x16A34A,   // #16A34A
        accent: 0xF59E0B,      // #F59E0B
        dark: 0x0F172A,        // #0F172A
        muted: 0x475569,       // #475569
        border: 0xE2E8F0,      // #E2E8F0
        light: 0xF8FAFC,       // #F8FAFC (clean light silhouette)
        cream: 0xFEF3C7        // #FEF3C7
    };

    /**
     * Factory function creating a low-poly worker bust using primitive geometries.
     * Uses a single light flat material for a clean silhouette against the solid circle,
     * omitting legs/boots and ground shadows.
     */
    function createWorker(THREE, options) {
        const group = new THREE.Group();

        // Single light flat material for crisp silhouette against colored circle
        const material = new THREE.MeshLambertMaterial({
            color: options.color || PALETTE.light,
            flatShading: true
        });

        // Torso (BoxGeometry)
        const torsoGeo = new THREE.BoxGeometry(0.68, 0.85, 0.42);
        const torsoMesh = new THREE.Mesh(torsoGeo, material);
        torsoMesh.position.y = 1.35;
        group.add(torsoMesh);

        // Belt / Waistline (BoxGeometry)
        const beltGeo = new THREE.BoxGeometry(0.70, 0.12, 0.44);
        const beltMesh = new THREE.Mesh(beltGeo, material);
        beltMesh.position.y = 0.95;
        group.add(beltMesh);

        // Neck (CylinderGeometry)
        const neckGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.12, 8);
        const neckMesh = new THREE.Mesh(neckGeo, material);
        neckMesh.position.y = 1.83;
        group.add(neckMesh);

        // Head (SphereGeometry)
        const headGroup = new THREE.Group();
        headGroup.position.y = 2.08;
        const headGeo = new THREE.SphereGeometry(0.24, 12, 10);
        const headMesh = new THREE.Mesh(headGeo, material);
        headGroup.add(headMesh);

        // Headgear
        if (options.hatType === 'hardhat') {
            const helmetGeo = new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55);
            const helmetMesh = new THREE.Mesh(helmetGeo, material);
            helmetMesh.position.y = 0.06;
            const brimGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.04, 14);
            const brimMesh = new THREE.Mesh(brimGeo, material);
            brimMesh.position.y = 0.06;
            headGroup.add(helmetMesh, brimMesh);
        } else if (options.hatType === 'cap') {
            const capGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.1, 12);
            const capMesh = new THREE.Mesh(capGeo, material);
            capMesh.position.y = 0.16;
            const visorGeo = new THREE.BoxGeometry(0.26, 0.03, 0.18);
            const visorMesh = new THREE.Mesh(visorGeo, material);
            visorMesh.position.set(0, 0.12, 0.2);
            headGroup.add(capMesh, visorMesh);
        }
        group.add(headGroup);

        // Limbs: Left Arm (BoxGeometry)
        const armGeo = new THREE.BoxGeometry(0.18, 0.65, 0.18);
        const leftArmPivot = new THREE.Group();
        leftArmPivot.position.set(-0.44, 1.7, 0);
        const leftArmMesh = new THREE.Mesh(armGeo, material);
        leftArmMesh.position.y = -0.32;
        const handGeo = new THREE.SphereGeometry(0.1, 8, 8);
        const leftHandMesh = new THREE.Mesh(handGeo, material);
        leftHandMesh.position.y = -0.68;
        leftArmPivot.add(leftArmMesh, leftHandMesh);
        group.add(leftArmPivot);

        // Limbs: Right Arm (BoxGeometry) — animated shoulder pivot
        const rightArmPivot = new THREE.Group();
        rightArmPivot.position.set(0.44, 1.7, 0);
        const rightArmMesh = new THREE.Mesh(armGeo, material);
        rightArmMesh.position.y = -0.32;
        const rightHandMesh = new THREE.Mesh(handGeo, material);
        rightHandMesh.position.y = -0.68;
        rightArmPivot.add(rightArmMesh, rightHandMesh);

        // Tools (CylinderGeometry & BoxGeometry)
        const toolGroup = new THREE.Group();
        toolGroup.position.set(0, -0.68, 0.05);

        if (options.toolType === 'paint_roller') {
            const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.65, 8);
            const handleMesh = new THREE.Mesh(handleGeo, material);
            handleMesh.position.y = 0.22;

            const rodGeo = new THREE.BoxGeometry(0.04, 0.22, 0.16);
            const rodMesh = new THREE.Mesh(rodGeo, material);
            rodMesh.position.set(0, 0.52, 0.08);

            const rollerGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.35, 12);
            rollerGeo.rotateZ(Math.PI / 2);
            const rollerMesh = new THREE.Mesh(rollerGeo, material);
            rollerMesh.position.set(0, 0.62, 0.12);

            toolGroup.add(handleMesh, rodMesh, rollerMesh);
        } else if (options.toolType === 'hammer') {
            const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8);
            const handleMesh = new THREE.Mesh(handleGeo, material);
            handleMesh.position.y = 0.15;

            const headGeo = new THREE.BoxGeometry(0.18, 0.08, 0.08);
            const headMesh = new THREE.Mesh(headGeo, material);
            headMesh.position.set(0, 0.38, 0);

            toolGroup.add(handleMesh, headMesh);
        } else if (options.toolType === 'wrench') {
            const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.45, 8);
            const handleMesh = new THREE.Mesh(handleGeo, material);
            handleMesh.position.y = 0.15;

            const headGeo = new THREE.BoxGeometry(0.14, 0.09, 0.06);
            const headMesh = new THREE.Mesh(headGeo, material);
            headMesh.position.set(0, 0.35, 0);

            toolGroup.add(handleMesh, headMesh);
        }

        rightArmPivot.add(toolGroup);
        group.add(rightArmPivot);

        return {
            group,
            headGroup,
            leftArmPivot,
            rightArmPivot,
            toolGroup
        };
    }

    let isImporting = false;
    let isInitialized = false;
    let hasFailed = false;
    let isVisible = false;
    let animationFrameId = null;
    const items = [];

    /**
     * Fallback all canvases to hidden in case of initialization failure.
     */
    function fallbackAll() {
        hasFailed = true;
        isInitialized = false;
        isImporting = false;
        stopLoop();
        for (let i = 0; i < canvases.length; i++) {
            canvases[i].style.display = 'none';
        }
    }

    /**
     * Shared render loop: updates and renders all alive canvas scenes.
     */
    function render(time) {
        let anyActive = false;
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.isDead) continue;
            anyActive = true;
            item.update(time);
            item.renderer.render(item.scene, item.camera);
        }
        if (!anyActive) {
            stopLoop();
        }
    }

    /**
     * Start the shared animation loop.
     */
    function startLoop() {
        if (!isInitialized || animationFrameId !== null) return;
        function animate(timestamp) {
            animationFrameId = requestAnimationFrame(animate);
            render(timestamp * 0.001);
        }
        animationFrameId = requestAnimationFrame(animate);
    }

    /**
     * Pause the shared animation loop.
     */
    function stopLoop() {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    /**
     * Update renderer dimensions on window resize.
     */
    function updateSizes() {
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.isDead) continue;
            const size = Math.round(item.canvas.getBoundingClientRect().width || 72);
            item.renderer.setSize(size, size, false);
        }
    }

    /**
     * Initialize Three.js renderers, cameras, scenes and worker figures for all 3 cards.
     */
    function initAllScenes(THREE) {
        const figureConfigs = [
            {
                // Card 1: Painter — painting arm motion
                hatType: 'cap',
                toolType: 'paint_roller',
                rotY: 0.25,
                createUpdate: function(worker) {
                    return function(time) {
                        worker.rightArmPivot.rotation.x = -0.65 + Math.sin(time * 2.2) * 0.45;
                        worker.group.position.y = Math.sin(time * 2.2) * 0.02;
                    };
                }
            },
            {
                // Card 2: Carpenter — hammering motion
                hatType: 'hardhat',
                toolType: 'hammer',
                rotY: -0.1,
                createUpdate: function(worker) {
                    return function(time) {
                        const cycle = (time * 3.2) % (Math.PI * 2);
                        const swing = Math.sin(cycle);
                        worker.rightArmPivot.rotation.x = -0.45 - (swing > 0 ? swing * 0.55 : swing * 0.12);
                        worker.headGroup.rotation.x = Math.sin(time * 3.2) * 0.06;
                    };
                }
            },
            {
                // Card 3: Technician — wrench tightening motion
                hatType: 'hardhat',
                toolType: 'wrench',
                rotY: -0.25,
                createUpdate: function(worker) {
                    return function(time) {
                        worker.rightArmPivot.rotation.x = -0.6 + Math.sin(time * 2.0) * 0.3;
                        worker.rightArmPivot.rotation.z = Math.cos(time * 2.0) * 0.15;
                        worker.group.rotation.y = -0.25 + Math.sin(time * 1.5) * 0.08;
                    };
                }
            }
        ];

        for (let i = 0; i < canvases.length; i++) {
            const canvas = canvases[i];
            canvas.style.display = 'block';

            const item = {
                canvas: canvas,
                renderer: null,
                scene: null,
                camera: null,
                update: null,
                isDead: false
            };

            // Per-canvas WebGL context loss isolation:
            // Hides only the affected canvas and prevents dead context calls
            canvas.addEventListener('webglcontextlost', function(event) {
                event.preventDefault();
                console.warn(`How It Works 3D: WebGL context lost on step ${i + 1}`);
                item.isDead = true;
                item.canvas.style.display = 'none';
            });

            const renderer = new THREE.WebGLRenderer({
                canvas: canvas,
                alpha: true,
                antialias: true,
                powerPreference: 'low-power'
            });
            renderer.setClearColor(0x000000, 0);

            const size = Math.round(canvas.getBoundingClientRect().width || 72);
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            renderer.setPixelRatio(pixelRatio);
            renderer.setSize(size, size, false);

            const scene = new THREE.Scene();

            // Perspective camera framed tightly on the upper body and tool
            const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
            camera.position.set(0, 1.62, 2.75);
            camera.lookAt(0, 1.62, 0);

            // Studio lighting for low-poly facets
            const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.75);
            const keyLight = new THREE.DirectionalLight(0xFFFFFF, 0.95);
            keyLight.position.set(3, 5, 4);
            const fillLight = new THREE.DirectionalLight(0x94A3B8, 0.4);
            fillLight.position.set(-3, 2, -2);
            scene.add(ambientLight, keyLight, fillLight);

            // Worker bust
            const config = figureConfigs[i];
            const worker = createWorker(THREE, {
                hatType: config.hatType,
                toolType: config.toolType,
                color: PALETTE.light
            });
            worker.group.rotation.y = config.rotY;
            scene.add(worker.group);

            item.renderer = renderer;
            item.scene = scene;
            item.camera = camera;
            item.update = config.createUpdate(worker);

            items.push(item);
        }

        window.addEventListener('resize', updateSizes, { passive: true });
    }

    // Single IntersectionObserver watching the entire How It Works section
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(async function(entry) {
            if (entry.isIntersecting) {
                isVisible = true;
                if (!hasFailed && !isInitialized && !isImporting) {
                    isImporting = true;
                    try {
                        const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
                        initAllScenes(THREE);
                        isInitialized = true;
                        if (isVisible) {
                            startLoop();
                        }
                    } catch (err) {
                        console.warn('How It Works 3D failed, falling back to static circles:', err);
                        fallbackAll();
                    }
                } else if (isInitialized) {
                    startLoop();
                }
            } else {
                isVisible = false;
                stopLoop();
            }
        });
    }, { threshold: 0.1 });

    observer.observe(section);
})();

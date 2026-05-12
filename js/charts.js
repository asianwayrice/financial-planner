document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('budget-donut-chart');
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext('2d');
    const segments = [
        { label: 'Needs',   value: 50, color: '#0f766e' },
        { label: 'Wants',   value: 30, color: '#2563eb' },
        { label: 'Savings', value: 20, color: '#14b8a6' }
    ];

    const WIDTH  = 320;
    const HEIGHT = 320;
    const TOTAL  = segments.reduce((s, seg) => s + seg.value, 0);

    let animProgress  = 0;      // 0 → 1 during draw-on animation
    let hoveredIndex  = -1;     // which segment the cursor is over
    let animFrame     = null;

    /* ── geometry helpers ───────────────────────────────────────── */

    function buildArcs(progress) {
        let start = -Math.PI / 2;
        return segments.map(seg => {
            const slice = (seg.value / TOTAL) * Math.PI * 2 * progress;
            const arc   = { start, end: start + slice };
            start += slice;
            return arc;
        });
    }

    function hitTest(mx, my, arcs, cx, cy, outerR, innerR) {
        const dx = mx - cx, dy = my - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < innerR || dist > outerR) return -1;
        let angle = Math.atan2(dy, dx);
        if (angle < -Math.PI / 2) angle += Math.PI * 2;   // normalise to match startAngle
        for (let i = 0; i < arcs.length; i++) {
            let s = arcs[i].start, e = arcs[i].end;
            // normalise arc bounds the same way
            if (s < -Math.PI / 2) s += Math.PI * 2;
            if (e < -Math.PI / 2) e += Math.PI * 2;
            if (s <= angle && angle <= e) return i;
        }
        return -1;
    }

    /* ── main draw ───────────────────────────────────────────────── */

    function draw() {
        const ratio  = window.devicePixelRatio || 1;
        canvas.width  = WIDTH  * ratio;
        canvas.height = HEIGHT * ratio;
        canvas.style.width  = WIDTH  + 'px';
        canvas.style.height = HEIGHT + 'px';
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, WIDTH, HEIGHT);

        const cx = WIDTH  / 2;
        const cy = HEIGHT / 2;
        const baseR  = Math.min(cx, cy) * 0.78;
        const hoverR = baseR * 1.07;   // expanded radius for hovered slice
        const innerR = baseR * 0.55;
        const isDark = document.body.classList.contains('dark-mode');

        const arcs = buildArcs(animProgress);

        /* slices */
        arcs.forEach((arc, i) => {
            const r = (i === hoveredIndex) ? hoverR : baseR;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, arc.start, arc.end);
            ctx.closePath();
            ctx.fillStyle = segments[i].color;
            ctx.globalAlpha = (hoveredIndex === -1 || i === hoveredIndex) ? 1 : 0.72;
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        /* donut hole */
        ctx.beginPath();
        ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
        ctx.fillStyle = isDark ? '#0b1320' : '#f4f4f4';
        ctx.fill();

        /* centre text */
        const primary   = isDark ? '#e5e7eb' : '#1f2937';
        const secondary = isDark ? '#94a3b8' : '#6b7280';

        if (hoveredIndex !== -1 && animProgress === 1) {
            const seg = segments[hoveredIndex];
            ctx.font = '700 22px Segoe UI, system-ui, sans-serif';
            ctx.fillStyle = segments[hoveredIndex].color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(seg.value + '%', cx, cy - 10);
            ctx.font = '500 13px Segoe UI, system-ui, sans-serif';
            ctx.fillStyle = secondary;
            ctx.fillText(seg.label, cx, cy + 14);
        } else {
            ctx.font = '700 17px Segoe UI, system-ui, sans-serif';
            ctx.fillStyle = primary;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('50/30/20', cx, cy - 10);
            ctx.font = '13px Segoe UI, system-ui, sans-serif';
            ctx.fillStyle = secondary;
            ctx.fillText('Budget rule', cx, cy + 13);
        }

        return arcs;   // returned so hover handler can reuse them
    }

    /* ── entrance animation ──────────────────────────────────────── */

    let lastArcs = buildArcs(0);

    function animate(startTime, timestamp) {
        const elapsed  = timestamp - startTime;
        const duration = 900;   // ms
        animProgress    = Math.min(elapsed / duration, 1);

        // ease-out cubic
        const t = 1 - Math.pow(1 - animProgress, 3);
        const fakeProgress = t;

        // rebuild with eased progress then draw
        const saved = animProgress;
        animProgress = fakeProgress;
        lastArcs = draw();
        animProgress = saved;

        if (animProgress < 1) {
            animFrame = requestAnimationFrame(ts => animate(startTime, ts));
        } else {
            animProgress = 1;
            lastArcs = draw();
        }
    }

    function startAnimation() {
        if (animFrame) cancelAnimationFrame(animFrame);
        animProgress = 0;
        animFrame = requestAnimationFrame(ts => animate(ts, ts));
    }

    /* ── hover interaction ───────────────────────────────────────── */

    function getMousePos(e) {
        const rect  = canvas.getBoundingClientRect();
        const scaleX = WIDTH  / rect.width;
        const scaleY = HEIGHT / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top)  * scaleY
        };
    }

    canvas.addEventListener('mousemove', e => {
        if (animProgress < 1) return;
        const { x, y } = getMousePos(e);
        const cx = WIDTH / 2, cy = HEIGHT / 2;
        const baseR  = Math.min(cx, cy) * 0.78;
        const innerR = baseR * 0.55;
        const hit    = hitTest(x, y, lastArcs, cx, cy, baseR * 1.07, innerR);
        if (hit !== hoveredIndex) {
            hoveredIndex = hit;
            canvas.style.cursor = hit !== -1 ? 'pointer' : 'default';
            lastArcs = draw();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (hoveredIndex !== -1) {
            hoveredIndex = -1;
            canvas.style.cursor = 'default';
            lastArcs = draw();
        }
    });

    /* ── theme change ────────────────────────────────────────────── */

    window.addEventListener('theme-change', () => {
        lastArcs = draw();
    });

    /* ── kick it off ─────────────────────────────────────────────── */

    startAnimation();
});
const ALL_TERRAINS = ['highland', 'forest', 'plain', 'swamp', 'desert', 'rocky', 'ruins'];

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generateMap = (width, height) => {
    const grid = Array(height).fill(null).map((_, y) =>
        Array(width).fill(null).map((_, x) => ({ x, y, type: 'empty', terrain: null }))
    );

    const start = { x: 0, y: 0 };
    const end = { x: width - 1, y: height - 1 };

    let validPath = null;
    const maxAttempts = 500;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        resetGridTypes(grid, start, end, width, height);
        placeRandomObstacles(grid, start, end, width, height, 0.2);

        const path = findPath(grid, start, end, width, height);
        if (!path) continue;
        if (!hasUShape(path)) continue;

        validPath = path;
        break;
    }

    if (!validPath) {
        resetGridTypes(grid, start, end, width, height);
        validPath = createFallbackUPath(width, height);
    }

    markPathCells(grid, validPath);
    convertBuildCells(grid, width, height);
    assignTerrainPatches(grid, width, height, ALL_TERRAINS);

    return { grid, path: validPath };
};

const resetGridTypes = (grid, start, end, width, height) => {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            grid[y][x].type = 'empty';
            grid[y][x].terrain = null;
        }
    }

    grid[start.y][start.x].type = 'start';
    grid[end.y][end.x].type = 'end';
};

const placeRandomObstacles = (grid, start, end, width, height, density) => {
    const obstaclesCount = Math.floor(width * height * density);
    let placed = 0;

    while (placed < obstaclesCount) {
        const rx = Math.floor(Math.random() * width);
        const ry = Math.floor(Math.random() * height);

        if ((rx === start.x && ry === start.y) || (rx === end.x && ry === end.y)) continue;

        if (grid[ry][rx].type === 'empty') {
            grid[ry][rx].type = 'obstacle';
            placed++;
        }
    }
};

const markPathCells = (grid, path) => {
    for (const p of path) {
        const cell = grid[p.y][p.x];
        if (cell.type === 'empty' || cell.type === 'obstacle') {
            cell.type = 'path';
        }
    }
};

const convertBuildCells = (grid, width, height) => {
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const cell = grid[y][x];
            if (cell.type === 'empty') {
                cell.type = 'build';
            }
        }
    }
};

const assignTerrainPatches = (grid, width, height, terrains) => {
    const nonObstacleCells = [];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x].type !== 'obstacle') {
                nonObstacleCells.push({ x, y });
            }
        }
    }

    const isUnassigned = (x, y) => grid[y][x].type !== 'obstacle' && !grid[y][x].terrain;

    let attempts = 0;
    while (attempts < 6000) {
        const unassigned = nonObstacleCells.filter(({ x, y }) => isUnassigned(x, y));
        if (unassigned.length === 0) break;

        const pivot = unassigned[Math.floor(Math.random() * unassigned.length)];
        const patchW = randomInt(2, 6);
        const patchH = randomInt(2, 6);

        const minStartX = Math.max(0, pivot.x - patchW + 1);
        const maxStartX = Math.min(pivot.x, width - patchW);
        const minStartY = Math.max(0, pivot.y - patchH + 1);
        const maxStartY = Math.min(pivot.y, height - patchH);

        if (maxStartX < minStartX || maxStartY < minStartY) {
            attempts++;
            continue;
        }

        const startX = randomInt(minStartX, maxStartX);
        const startY = randomInt(minStartY, maxStartY);
        const terrain = terrains[Math.floor(Math.random() * terrains.length)];

        for (let y = startY; y < startY + patchH; y++) {
            for (let x = startX; x < startX + patchW; x++) {
                if (grid[y][x].type !== 'obstacle') {
                    grid[y][x].terrain = terrain;
                }
            }
        }

        attempts++;
    }

    // Safety fallback for any rare uncovered cells.
    for (const { x, y } of nonObstacleCells) {
        if (!grid[y][x].terrain) {
            grid[y][x].terrain = terrains[Math.floor(Math.random() * terrains.length)];
        }
    }
};

const hasUShape = (path) => {
    if (!path || path.length < 4) return false;

    const dirs = [];
    for (let i = 0; i < path.length - 1; i++) {
        dirs.push({
            dx: path[i + 1].x - path[i].x,
            dy: path[i + 1].y - path[i].y
        });
    }

    for (let i = 0; i < dirs.length - 2; i++) {
        const a = dirs[i];
        const b = dirs[i + 1];
        const c = dirs[i + 2];

        const turnExists = (a.dx !== b.dx || a.dy !== b.dy) && (b.dx !== c.dx || b.dy !== c.dy);
        const oppositeEnds = a.dx === -c.dx && a.dy === -c.dy;

        if (turnExists && oppositeEnds) return true;
    }

    return false;
};

const createFallbackUPath = (width, height) => {
    const path = [];

    const topRun = Math.min(width - 1, 5);
    const downRun = Math.min(height - 1, 5);
    const leftBack = Math.max(1, topRun - 3);

    let x = 0;
    let y = 0;
    path.push({ x, y });

    while (x < topRun) {
        x++;
        path.push({ x, y });
    }

    while (y < downRun) {
        y++;
        path.push({ x, y });
    }

    while (x > leftBack) {
        x--;
        path.push({ x, y });
    }

    while (y < height - 1) {
        y++;
        path.push({ x, y });
    }

    while (x < width - 1) {
        x++;
        path.push({ x, y });
    }

    return path;
};

const findPath = (grid, start, end, width, height) => {
    const queue = [{ pos: start, path: [start] }];
    const visited = new Set([`${start.x},${start.y}`]);

    while (queue.length > 0) {
        const { pos, path } = queue.shift();

        if (pos.x === end.x && pos.y === end.y) return path;

        const dirs = [[0, 1], [1, 0], [0, -1], [-1, 0]];
        for (const [dx, dy] of dirs) {
            const nx = pos.x + dx;
            const ny = pos.y + dy;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const cell = grid[ny][nx];
                if (cell.type !== 'obstacle' && !visited.has(`${nx},${ny}`)) {
                    visited.add(`${nx},${ny}`);
                    queue.push({ pos: { x: nx, y: ny }, path: [...path, { x: nx, y: ny }] });
                }
            }
        }
    }

    return null;
};

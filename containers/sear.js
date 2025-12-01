// Advanced Container Packing Algorithm v2.0
// Implements spatial indexing, wall building, stability checking, and weight balancing

class AdvancedPackingAlgorithm {
    constructor() {
        this.EPSILON = 0.001; // Tolerance for floating point comparisons
        this.MAX_ITERATIONS = 1000;
        this.STABILITY_THRESHOLD = 0.7; // 70% support required
    }

    // Main packing entry point
    packItems(items, container, options = {}) {
        const {
            algorithm = 'auto',
            allowRotation = true,
            optimizeWeight = true,
            checkStability = true,
            maxIterations = this.MAX_ITERATIONS
        } = options;

        // Sort items for better packing
        const sortedItems = this.sortItems(items, algorithm);
        
        // Choose packing strategy
        let result;
        switch (algorithm) {
            case 'wall-building':
                result = this.wallBuildingPack(sortedItems, container, allowRotation);
                break;
            case 'corner-first':
                result = this.cornerFirstPack(sortedItems, container, allowRotation);
                break;
            case 'layer-building':
                result = this.layerBuildingPack(sortedItems, container, allowRotation);
                break;
            case 'spatial-index':
                result = this.spatialIndexPack(sortedItems, container, allowRotation);
                break;
            case 'auto':
            default:
                result = this.autoPack(sortedItems, container, allowRotation);
        }

        // Post-processing optimizations
        if (optimizeWeight && result.packed.length > 0) {
            result.packed = this.optimizeWeightDistribution(result.packed, container);
        }

        if (checkStability) {
            result.stability = this.analyzeStability(result.packed, container);
        }

        // Calculate final metrics
        result.metrics = this.calculateMetrics(result.packed, container);
        
        return result;
    }

    // Automatic algorithm selection based on item characteristics
    autoPack(items, container, allowRotation) {
        const characteristics = this.analyzeItems(items);
        
        if (characteristics.uniformity > 0.8) {
            // Highly uniform items - use spatial index for optimal placement
            return this.spatialIndexPack(items, container, allowRotation);
        } else if (characteristics.averageAspectRatio > 2) {
            // Long/tall items - use wall building
            return this.wallBuildingPack(items, container, allowRotation);
        } else if (characteristics.weightVariation > 0.5) {
            // High weight variation - use corner-first for stability
            return this.cornerFirstPack(items, container, allowRotation);
        } else {
            // Mixed items - use layer building
            return this.layerBuildingPack(items, container, allowRotation);
        }
    }

    // Spatial Index Packing - Most efficient for space utilization
    spatialIndexPack(items, container, allowRotation) {
        const index = new SpatialIndex(container);
        const packed = [];
        const unpacked = [];

        for (const item of items) {
            const placement = index.findBestPlacement(item, allowRotation);
            
            if (placement) {
                const packedItem = {
                    ...item,
                    position: placement.position,
                    rotation: placement.rotation,
                    dimensions: placement.dimensions
                };
                packed.push(packedItem);
                index.addItem(packedItem);
            } else {
                unpacked.push(item);
            }
        }

        return { packed, unpacked };
    }

    // Wall Building Algorithm - Good for stability and loading efficiency
    wallBuildingPack(items, container, allowRotation) {
        const walls = [];
        const packed = [];
        const unpacked = [];
        let currentX = -container.length / 2;

        // Sort by height for stable walls
        const sortedByHeight = [...items].sort((a, b) => b.height - a.height);

        for (const item of sortedByHeight) {
            let placed = false;

            // Try to add to existing wall
            for (const wall of walls) {
                if (this.canAddToWall(wall, item, container, allowRotation)) {
                    const position = this.addItemToWall(wall, item, container, allowRotation);
                    packed.push({
                        ...item,
                        position: position.position,
                        rotation: position.rotation,
                        dimensions: position.dimensions
                    });
                    placed = true;
                    break;
                }
            }

            // Create new wall if needed
            if (!placed && currentX + item.length <= container.length / 2) {
                const wall = this.createWall(currentX, container);
                const position = this.addItemToWall(wall, item, container, allowRotation);
                
                if (position) {
                    walls.push(wall);
                    packed.push({
                        ...item,
                        position: position.position,
                        rotation: position.rotation,
                        dimensions: position.dimensions
                    });
                    currentX = wall.maxX;
                } else {
                    unpacked.push(item);
                }
            } else if (!placed) {
                unpacked.push(item);
            }
        }

        return { packed, unpacked };
    }

    // Corner-First Packing - Prioritizes stability
    cornerFirstPack(items, container, allowRotation) {
        const positions = this.generateCornerPositions(container);
        const packed = [];
        const unpacked = [];
        const occupiedSpaces = [];

        // Sort items by volume (largest first) and weight (heaviest first)
        const sorted = [...items].sort((a, b) => {
            const volA = a.length * a.width * a.height;
            const volB = b.length * b.width * b.height;
            const weightA = a.weight || 1;
            const weightB = b.weight || 1;
            return (volB * weightB) - (volA * weightA);
        });

        for (const item of sorted) {
            let bestPosition = null;
            let bestScore = Infinity;
            let bestRotation = { x: 0, y: 0, z: 0 };
            let bestDimensions = { length: item.length, width: item.width, height: item.height };

            const orientations = allowRotation ? 
                this.getAllOrientations(item) : [item];

            for (const orientation of orientations) {
                for (const pos of positions) {
                    if (this.canPlace(pos, orientation, container, occupiedSpaces)) {
                        const score = this.calculateCornerScore(pos, orientation, container);
                        if (score < bestScore) {
                            bestScore = score;
                            bestPosition = pos;
                            bestRotation = orientation.rotation;
                            bestDimensions = orientation.dimensions;
                        }
                    }
                }
            }

            if (bestPosition) {
                const packedItem = {
                    ...item,
                    position: bestPosition,
                    rotation: bestRotation,
                    dimensions: bestDimensions
                };
                packed.push(packedItem);
                occupiedSpaces.push(packedItem);
                
                // Generate new positions based on this placement
                this.addNewPositions(positions, packedItem, container);
            } else {
                unpacked.push(item);
            }
        }

        return { packed, unpacked };
    }

    // Layer Building - Traditional approach, good for uniform items
    layerBuildingPack(items, container, allowRotation) {
        const layers = [];
        const packed = [];
        const unpacked = [];
        let currentZ = 0;

        // Group items by similar heights
        const heightGroups = this.groupByHeight(items);

        for (const group of heightGroups) {
            if (currentZ >= container.height) break;

            const layer = {
                z: currentZ,
                height: group.height,
                items: []
            };

            const layerResult = this.packLayer(
                group.items, 
                container, 
                currentZ, 
                allowRotation
            );

            if (layerResult.packed.length > 0) {
                layers.push(layer);
                packed.push(...layerResult.packed);
                unpacked.push(...layerResult.unpacked);
                currentZ += group.height;
            } else {
                unpacked.push(...group.items);
            }
        }

        return { packed, unpacked };
    }

    // Pack items within a single layer
    packLayer(items, container, z, allowRotation) {
        const packed = [];
        const unpacked = [];
        const spaces = [{
            x: -container.length / 2,
            y: -container.width / 2,
            width: container.length,
            height: container.width
        }];

        for (const item of items) {
            let placed = false;

            const orientations = allowRotation ? 
                this.get2DOrientations(item) : [item];

            for (const orientation of orientations) {
                for (let i = 0; i < spaces.length; i++) {
                    const space = spaces[i];
                    
                    if (orientation.length <= space.width && 
                        orientation.width <= space.height) {
                        
                        // Place item
                        packed.push({
                            ...item,
                            position: {
                                x: space.x,
                                y: space.y,
                                z: z
                            },
                            rotation: orientation.rotation,
                            dimensions: orientation.dimensions
                        });

                        // Split remaining space
                        spaces.splice(i, 1);
                        const newSpaces = this.split2DSpace(space, orientation);
                        spaces.push(...newSpaces);
                        
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }

            if (!placed) {
                unpacked.push(item);
            }
        }

        return { packed, unpacked };
    }

    // Weight distribution optimization
    optimizeWeightDistribution(items, container) {
        const targetCenter = {
            x: 0,
            y: 0,
            z: container.height * 0.25 // Ideal center of mass is 1/4 height
        };

        const centerOfMass = this.calculateCenterOfMass(items);
        const deviation = this.calculateDeviation(centerOfMass, targetCenter);

        if (deviation > container.length * 0.1) {
            // Try to rebalance by swapping items
            return this.rebalanceItems(items, targetCenter, container);
        }

        return items;
    }

    // Stability analysis
    analyzeStability(items, container) {
        const issues = [];
        let totalScore = 0;

        for (const item of items) {
            if (item.position.z > 0) {
                const support = this.calculateSupport(item, items);
                totalScore += support.percentage;

                if (support.percentage < this.STABILITY_THRESHOLD) {
                    issues.push({
                        item: item,
                        support: support.percentage,
                        unsupportedCorners: support.unsupportedCorners,
                        recommendation: this.getStabilityRecommendation(support)
                    });
                }
            } else {
                totalScore += 1; // Floor items are fully stable
            }
        }

        const averageStability = items.length > 0 ? totalScore / items.length : 1;

        return {
            score: averageStability,
            isStable: issues.length === 0,
            issues: issues,
            recommendation: this.getOverallStabilityRecommendation(averageStability, issues)
        };
    }

    // Calculate support for an item
    calculateSupport(item, allItems) {
        const corners = [
            { x: item.position.x, y: item.position.y },
            { x: item.position.x + item.dimensions.length, y: item.position.y },
            { x: item.position.x, y: item.position.y + item.dimensions.width },
            { x: item.position.x + item.dimensions.length, y: item.position.y + item.dimensions.width }
        ];

        let supportedCorners = 0;
        const unsupportedCorners = [];

        for (const corner of corners) {
            const hasSupport = allItems.some(other => {
                if (other === item || other.position.z >= item.position.z) return false;
                
                const otherTop = other.position.z + other.dimensions.height;
                if (Math.abs(otherTop - item.position.z) > this.EPSILON) return false;

                return corner.x >= other.position.x - this.EPSILON &&
                       corner.x <= other.position.x + other.dimensions.length + this.EPSILON &&
                       corner.y >= other.position.y - this.EPSILON &&
                       corner.y <= other.position.y + other.dimensions.width + this.EPSILON;
            });

            if (hasSupport) {
                supportedCorners++;
            } else {
                unsupportedCorners.push(corner);
            }
        }

        return {
            percentage: supportedCorners / corners.length,
            supportedCorners: supportedCorners,
            totalCorners: corners.length,
            unsupportedCorners: unsupportedCorners
        };
    }

    // Helper methods
    sortItems(items, algorithm) {
        const itemsWithVolume = items.map(item => ({
            ...item,
            volume: item.length * item.width * item.height,
            maxDim: Math.max(item.length, item.width, item.height),
            weight: item.weight || 1
        }));

        switch (algorithm) {
            case 'wall-building':
                // Sort by height then volume for wall building
                return itemsWithVolume.sort((a, b) => 
                    b.height - a.height || b.volume - a.volume
                );
            case 'corner-first':
                // Sort by weight and volume for corner placement
                return itemsWithVolume.sort((a, b) => 
                    b.weight * b.volume - a.weight * a.volume
                );
            default:
                // Default: largest items first
                return itemsWithVolume.sort((a, b) => b.volume - a.volume);
        }
    }

    getAllOrientations(item) {
        const orientations = [];
        const dims = [item.length, item.width, item.height];
        
        // Generate all 6 possible orientations
        const permutations = [
            [0, 1, 2], [0, 2, 1],
            [1, 0, 2], [1, 2, 0],
            [2, 0, 1], [2, 1, 0]
        ];

        for (const perm of permutations) {
            orientations.push({
                dimensions: {
                    length: dims[perm[0]],
                    width: dims[perm[1]],
                    height: dims[perm[2]]
                },
                rotation: this.getRotationFromPermutation(perm),
                original: item
            });
        }

        return orientations;
    }

    get2DOrientations(item) {
        return [
            {
                length: item.length,
                width: item.width,
                dimensions: { length: item.length, width: item.width, height: item.height },
                rotation: { x: 0, y: 0, z: 0 }
            },
            {
                length: item.width,
                width: item.length,
                dimensions: { length: item.width, width: item.length, height: item.height },
                rotation: { x: 0, y: 0, z: 90 }
            }
        ];
    }

    getRotationFromPermutation(perm) {
        // Map permutation to rotation angles
        const rotationMap = {
            '012': { x: 0, y: 0, z: 0 },
            '021': { x: 90, y: 0, z: 0 },
            '102': { x: 0, y: 0, z: 90 },
            '120': { x: 0, y: 90, z: 0 },
            '201': { x: 90, y: 0, z: 90 },
            '210': { x: 90, y: 90, z: 0 }
        };
        
        return rotationMap[perm.join('')] || { x: 0, y: 0, z: 0 };
    }

    analyzeItems(items) {
        if (items.length === 0) {
            return {
                uniformity: 0,
                averageAspectRatio: 1,
                weightVariation: 0
            };
        }

        // Calculate uniformity (how similar are the items)
        const dimensions = items.map(item => ({
            l: item.length,
            w: item.width,
            h: item.height
        }));

        const avgDims = {
            l: dimensions.reduce((sum, d) => sum + d.l, 0) / dimensions.length,
            w: dimensions.reduce((sum, d) => sum + d.w, 0) / dimensions.length,
            h: dimensions.reduce((sum, d) => sum + d.h, 0) / dimensions.length
        };

        const variance = dimensions.reduce((sum, d) => {
            return sum + 
                Math.pow(d.l - avgDims.l, 2) +
                Math.pow(d.w - avgDims.w, 2) +
                Math.pow(d.h - avgDims.h, 2);
        }, 0) / dimensions.length;

        const uniformity = 1 / (1 + variance);

        // Calculate average aspect ratio
        const aspectRatios = items.map(item => {
            const sorted = [item.length, item.width, item.height].sort((a, b) => b - a);
            return sorted[0] / sorted[2];
        });

        const averageAspectRatio = aspectRatios.reduce((sum, r) => sum + r, 0) / aspectRatios.length;

        // Calculate weight variation
        const weights = items.map(item => item.weight || 1);
        const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
        const weightVar = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
        const weightVariation = Math.sqrt(weightVar) / avgWeight;

        return {
            uniformity,
            averageAspectRatio,
            weightVariation
        };
    }

    calculateMetrics(packed, container) {
        const containerVolume = container.length * container.width * container.height;
        const packedVolume = packed.reduce((sum, item) => {
            return sum + (item.dimensions.length * item.dimensions.width * item.dimensions.height);
        }, 0);

        const totalWeight = packed.reduce((sum, item) => sum + (item.weight || 1), 0);
        
        // Calculate bounding box of packed items
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;

        packed.forEach(item => {
            minX = Math.min(minX, item.position.x);
            maxX = Math.max(maxX, item.position.x + item.dimensions.length);
            minY = Math.min(minY, item.position.y);
            maxY = Math.max(maxY, item.position.y + item.dimensions.width);
            minZ = Math.min(minZ, item.position.z);
            maxZ = Math.max(maxZ, item.position.z + item.dimensions.height);
        });

        const usedLength = maxX - minX;
        const usedWidth = maxY - minY;
        const usedHeight = maxZ - minZ;
        const usedVolume = usedLength * usedWidth * usedHeight;

        return {
            volumeUtilization: (packedVolume / containerVolume) * 100,
            spaceEfficiency: (packedVolume / usedVolume) * 100,
            itemsPacked: packed.length,
            totalWeight: totalWeight,
            usedDimensions: {
                length: usedLength,
                width: usedWidth,
                height: usedHeight
            },
            centerOfMass: this.calculateCenterOfMass(packed)
        };
    }

    calculateCenterOfMass(items) {
        if (items.length === 0) {
            return { x: 0, y: 0, z: 0 };
        }

        let totalWeight = 0;
        let weightedX = 0, weightedY = 0, weightedZ = 0;

        items.forEach(item => {
            const weight = item.weight || 1;
            const centerX = item.position.x + item.dimensions.length / 2;
            const centerY = item.position.y + item.dimensions.width / 2;
            const centerZ = item.position.z + item.dimensions.height / 2;

            totalWeight += weight;
            weightedX += centerX * weight;
            weightedY += centerY * weight;
            weightedZ += centerZ * weight;
        });

        return {
            x: weightedX / totalWeight,
            y: weightedY / totalWeight,
            z: weightedZ / totalWeight
        };
    }

    // Additional helper methods for specific algorithms
    createWall(x, container) {
        return {
            x: x,
            maxX: x,
            layers: [],
            currentZ: 0
        };
    }

    canAddToWall(wall, item, container, allowRotation) {
        if (wall.currentZ + item.height > container.height) {
            return false;
        }

        // Check if item width fits in the wall
        const orientations = allowRotation ? 
            this.getAllOrientations(item) : [{ dimensions: item }];

        return orientations.some(o => 
            o.dimensions.width <= container.width &&
            wall.x + o.dimensions.length <= container.length / 2
        );
    }

    addItemToWall(wall, item, container, allowRotation) {
        // Find best orientation for this wall
        const orientations = allowRotation ? 
            this.getAllOrientations(item) : [{ dimensions: item, rotation: { x: 0, y: 0, z: 0 } }];

        let bestOrientation = null;
        let bestY = null;

        for (const orientation of orientations) {
            // Try to place in existing layer
            for (const layer of wall.layers) {
                if (layer.height >= orientation.dimensions.height &&
                    layer.currentY + orientation.dimensions.width <= container.width / 2) {
                    
                    bestOrientation = orientation;
                    bestY = layer.currentY;
                    layer.currentY += orientation.dimensions.width;
                    
                    if (wall.x + orientation.dimensions.length > wall.maxX) {
                        wall.maxX = wall.x + orientation.dimensions.length;
                    }
                    
                    return {
                        position: {
                            x: wall.x,
                            y: -container.width / 2 + bestY,
                            z: layer.z
                        },
                        rotation: orientation.rotation,
                        dimensions: orientation.dimensions
                    };
                }
            }
        }

        // Create new layer
        const bestOr = orientations[0];
        const newLayer = {
            z: wall.currentZ,
            height: bestOr.dimensions.height,
            currentY: bestOr.dimensions.width
        };
        
        wall.layers.push(newLayer);
        wall.currentZ += bestOr.dimensions.height;
        
        if (wall.x + bestOr.dimensions.length > wall.maxX) {
            wall.maxX = wall.x + bestOr.dimensions.length;
        }

        return {
            position: {
                x: wall.x,
                y: -container.width / 2,
                z: newLayer.z
            },
            rotation: bestOr.rotation,
            dimensions: bestOr.dimensions
        };
    }

    generateCornerPositions(container) {
        // Start with container corners at floor level
        return [
            { x: -container.length / 2, y: -container.width / 2, z: 0 },
            { x: container.length / 2, y: -container.width / 2, z: 0 },
            { x: -container.length / 2, y: container.width / 2, z: 0 },
            { x: container.length / 2, y: container.width / 2, z: 0 }
        ];
    }

    addNewPositions(positions, placedItem, container) {
        // Add positions adjacent to the placed item
        const newPositions = [
            // Right of item
            {
                x: placedItem.position.x + placedItem.dimensions.length,
                y: placedItem.position.y,
                z: placedItem.position.z
            },
            // Front of item
            {
                x: placedItem.position.x,
                y: placedItem.position.y + placedItem.dimensions.width,
                z: placedItem.position.z
            },
            // Top of item
            {
                x: placedItem.position.x,
                y: placedItem.position.y,
                z: placedItem.position.z + placedItem.dimensions.height
            }
        ];

        // Add valid positions
        newPositions.forEach(pos => {
            if (pos.x <= container.length / 2 &&
                pos.y <= container.width / 2 &&
                pos.z <= container.height &&
                !positions.some(p => 
                    Math.abs(p.x - pos.x) < this.EPSILON &&
                    Math.abs(p.y - pos.y) < this.EPSILON &&
                    Math.abs(p.z - pos.z) < this.EPSILON
                )) {
                positions.push(pos);
            }
        });
    }

    canPlace(position, item, container, occupiedSpaces) {
        // Check container bounds
        if (position.x + item.dimensions.length > container.length / 2 ||
            position.y + item.dimensions.width > container.width / 2 ||
            position.z + item.dimensions.height > container.height) {
            return false;
        }

        // Check collisions with occupied spaces
        for (const occupied of occupiedSpaces) {
            if (this.boxesIntersect(
                { ...position, ...item.dimensions },
                { ...occupied.position, ...occupied.dimensions }
            )) {
                return false;
            }
        }

        return true;
    }

    boxesIntersect(box1, box2) {
        return !(box1.x + box1.length <= box2.x + this.EPSILON ||
                 box2.x + box2.length <= box1.x + this.EPSILON ||
                 box1.y + box1.width <= box2.y + this.EPSILON ||
                 box2.y + box2.width <= box1.y + this.EPSILON ||
                 box1.z + box1.height <= box2.z + this.EPSILON ||
                 box2.z + box2.height <= box1.z + this.EPSILON);
    }

    calculateCornerScore(position, item, container) {
        // Prefer positions that are:
        // 1. Lower in the container
        // 2. Closer to corners
        // 3. Against walls
        
        const cornerDistance = Math.min(
            Math.sqrt(Math.pow(position.x + container.length/2, 2) + Math.pow(position.y + container.width/2, 2)),
            Math.sqrt(Math.pow(position.x - container.length/2, 2) + Math.pow(position.y + container.width/2, 2)),
            Math.sqrt(Math.pow(position.x + container.length/2, 2) + Math.pow(position.y - container.width/2, 2)),
            Math.sqrt(Math.pow(position.x - container.length/2, 2) + Math.pow(position.y - container.width/2, 2))
        );

        const heightPenalty = position.z / container.height;
        const wallBonus = (
            (Math.abs(position.x + container.length/2) < this.EPSILON ? 0.1 : 0) +
            (Math.abs(position.y + container.width/2) < this.EPSILON ? 0.1 : 0) +
            (position.z === 0 ? 0.2 : 0)
        );

        return cornerDistance * 0.4 + heightPenalty * 0.6 - wallBonus;
    }

    split2DSpace(space, item) {
        const spaces = [];
        
        // Right space
        if (space.width - item.length > this.EPSILON) {
            spaces.push({
                x: space.x + item.length,
                y: space.y,
                width: space.width - item.length,
                height: space.height
            });
        }

        // Top space
        if (space.height - item.width > this.EPSILON) {
            spaces.push({
                x: space.x,
                y: space.y + item.width,
                width: item.length,
                height: space.height - item.width
            });
        }

        return spaces;
    }

    groupByHeight(items, tolerance = 0.1) {
        const groups = [];
        const sorted = [...items].sort((a, b) => a.height - b.height);

        sorted.forEach(item => {
            let added = false;
            
            for (const group of groups) {
                if (Math.abs(group.height - item.height) <= tolerance) {
                    group.items.push(item);
                    added = true;
                    break;
                }
            }

            if (!added) {
                groups.push({
                    height: item.height,
                    items: [item]
                });
            }
        });

        return groups;
    }

    rebalanceItems(items, targetCenter, container) {
        // Simple rebalancing: swap heavy items from high positions with light items from low positions
        const itemsCopy = [...items];
        const centerOfMass = this.calculateCenterOfMass(itemsCopy);
        
        if (centerOfMass.z > targetCenter.z * 1.2) {
            // Center of mass is too high, try to lower it
            itemsCopy.sort((a, b) => {
                const scoreA = (a.weight || 1) * a.position.z;
                const scoreB = (b.weight || 1) * b.position.z;
                return scoreB - scoreA;
            });

            // Swap positions of heavy high items with light low items
            const numSwaps = Math.min(5, Math.floor(items.length / 4));
            for (let i = 0; i < numSwaps; i++) {
                const highItem = itemsCopy[i];
                const lowItem = itemsCopy[itemsCopy.length - 1 - i];
                
                // Swap positions if dimensions allow
                if (this.canSwap(highItem, lowItem)) {
                    const tempPos = { ...highItem.position };
                    highItem.position = { ...lowItem.position };
                    lowItem.position = tempPos;
                }
            }
        }

        return itemsCopy;
    }

    canSwap(item1, item2) {
        // Check if items can swap positions based on dimensions
        return Math.abs(item1.dimensions.length - item2.dimensions.length) < this.EPSILON &&
               Math.abs(item1.dimensions.width - item2.dimensions.width) < this.EPSILON &&
               Math.abs(item1.dimensions.height - item2.dimensions.height) < this.EPSILON;
    }

    calculateDeviation(point1, point2) {
        return Math.sqrt(
            Math.pow(point1.x - point2.x, 2) +
            Math.pow(point1.y - point2.y, 2) +
            Math.pow(point1.z - point2.z, 2)
        );
    }

    getStabilityRecommendation(support) {
        if (support.percentage < 0.25) {
            return "Critical: Item has less than 25% support. Consider repositioning or adding support.";
        } else if (support.percentage < 0.5) {
            return "Warning: Item has less than 50% support. May shift during transport.";
        } else if (support.percentage < 0.7) {
            return "Caution: Item has marginal support. Consider improving placement.";
        }
        return "Acceptable support level.";
    }

    getOverallStabilityRecommendation(score, issues) {
        if (score > 0.9 && issues.length === 0) {
            return "Excellent stability. Load is well-balanced and secure.";
        } else if (score > 0.8 && issues.length <= 2) {
            return "Good stability with minor issues. Consider adjusting highlighted items.";
        } else if (score > 0.7) {
            return "Acceptable stability but improvements recommended for safe transport.";
        } else if (score > 0.5) {
            return "Poor stability. Significant adjustments needed to prevent shifting.";
        }
        return "Critical stability issues. Complete reorganization recommended.";
    }
}

// Spatial Index class for efficient space management
class SpatialIndex {
    constructor(container) {
        this.container = container;
        this.freeSpaces = [{
            x: -container.length / 2,
            y: -container.width / 2,
            z: 0,
            length: container.length,
            width: container.width,
            height: container.height
        }];
        this.occupiedSpaces = [];
        this.EPSILON = 0.001;
    }

    findBestPlacement(item, allowRotation = true) {
        let bestPlacement = null;
        let bestScore = Infinity;

        const orientations = allowRotation ? 
            this.getAllOrientations(item) : 
            [{ dimensions: item, rotation: { x: 0, y: 0, z: 0 } }];

        for (const space of this.freeSpaces) {
            for (const orientation of orientations) {
                if (this.canFit(space, orientation.dimensions)) {
                    const score = this.scoreSpace(space, orientation.dimensions);
                    
                    if (score < bestScore) {
                        bestScore = score;
                        bestPlacement = {
                            position: {
                                x: space.x,
                                y: space.y,
                                z: space.z
                            },
                            rotation: orientation.rotation,
                            dimensions: orientation.dimensions,
                            spaceIndex: this.freeSpaces.indexOf(space)
                        };
                    }
                }
            }
        }

        return bestPlacement;
    }

    canFit(space, dimensions) {
        return dimensions.length <= space.length + this.EPSILON &&
               dimensions.width <= space.width + this.EPSILON &&
               dimensions.height <= space.height + this.EPSILON;
    }

    scoreSpace(space, dimensions) {
        // Multi-criteria scoring:
        // 1. Minimize wasted space
        const wastedVolume = (space.length * space.width * space.height) -
                           (dimensions.length * dimensions.width * dimensions.height);
        
        // 2. Prefer lower positions
        const heightPenalty = space.z;
        
        // 3. Prefer positions closer to origin (corner)
        const distanceFromOrigin = Math.sqrt(
            space.x * space.x + 
            space.y * space.y + 
            space.z * space.z
        );
        
        // 4. Prefer exact fits
        const fitQuality = 
            Math.abs(space.length - dimensions.length) +
            Math.abs(space.width - dimensions.width) +
            Math.abs(space.height - dimensions.height);

        return wastedVolume * 0.3 + 
               heightPenalty * 0.3 + 
               distanceFromOrigin * 0.2 + 
               fitQuality * 0.2;
    }

    addItem(item) {
        // Find the space where this item was placed
        const spaceIndex = this.freeSpaces.findIndex(space =>
            Math.abs(space.x - item.position.x) < this.EPSILON &&
            Math.abs(space.y - item.position.y) < this.EPSILON &&
            Math.abs(space.z - item.position.z) < this.EPSILON
        );

        if (spaceIndex !== -1) {
            const space = this.freeSpaces[spaceIndex];
            this.freeSpaces.splice(spaceIndex, 1);

            // Generate new free spaces using guillotine cuts
            const newSpaces = this.splitSpace(space, item);
            
            // Add new spaces, merging if possible
            newSpaces.forEach(newSpace => {
                this.addFreeSpace(newSpace);
            });
        }

        // Add to occupied spaces
        this.occupiedSpaces.push({
            x: item.position.x,
            y: item.position.y,
            z: item.position.z,
            length: item.dimensions.length,
            width: item.dimensions.width,
            height: item.dimensions.height
        });
    }

    splitSpace(space, item) {
        const newSpaces = [];

        // Right space
        if (space.length - item.dimensions.length > this.EPSILON) {
            newSpaces.push({
                x: space.x + item.dimensions.length,
                y: space.y,
                z: space.z,
                length: space.length - item.dimensions.length,
                width: space.width,
                height: space.height
            });
        }

        // Front space
        if (space.width - item.dimensions.width > this.EPSILON) {
            newSpaces.push({
                x: space.x,
                y: space.y + item.dimensions.width,
                z: space.z,
                length: item.dimensions.length,
                width: space.width - item.dimensions.width,
                height: space.height
            });
        }

        // Top space
        if (space.height - item.dimensions.height > this.EPSILON) {
            newSpaces.push({
                x: space.x,
                y: space.y,
                z: space.z + item.dimensions.height,
                length: item.dimensions.length,
                width: item.dimensions.width,
                height: space.height - item.dimensions.height
            });
        }

        return newSpaces;
    }

    addFreeSpace(newSpace) {
        // Check if this space can be merged with existing spaces
        let merged = false;
        
        for (let i = 0; i < this.freeSpaces.length; i++) {
            const existingSpace = this.freeSpaces[i];
            
            if (this.canMerge(existingSpace, newSpace)) {
                this.freeSpaces[i] = this.mergeSpaces(existingSpace, newSpace);
                merged = true;
                break;
            }
        }

        if (!merged) {
            // Check if the new space overlaps with occupied spaces
            let isValid = true;
            for (const occupied of this.occupiedSpaces) {
                if (this.spacesOverlap(newSpace, occupied)) {
                    isValid = false;
                    break;
                }
            }

            if (isValid) {
                this.freeSpaces.push(newSpace);
            }
        }
    }

    canMerge(space1, space2) {
        // Spaces can merge if they share a face and have same dimensions on other axes
        // Check X-axis adjacency
        if (Math.abs(space1.x + space1.length - space2.x) < this.EPSILON &&
            Math.abs(space1.y - space2.y) < this.EPSILON &&
            Math.abs(space1.z - space2.z) < this.EPSILON &&
            Math.abs(space1.width - space2.width) < this.EPSILON &&
            Math.abs(space1.height - space2.height) < this.EPSILON) {
            return true;
        }

        // Check Y-axis adjacency
        if (Math.abs(space1.y + space1.width - space2.y) < this.EPSILON &&
            Math.abs(space1.x - space2.x) < this.EPSILON &&
            Math.abs(space1.z - space2.z) < this.EPSILON &&
            Math.abs(space1.length - space2.length) < this.EPSILON &&
            Math.abs(space1.height - space2.height) < this.EPSILON) {
            return true;
        }

        // Check Z-axis adjacency
        if (Math.abs(space1.z + space1.height - space2.z) < this.EPSILON &&
            Math.abs(space1.x - space2.x) < this.EPSILON &&
            Math.abs(space1.y - space2.y) < this.EPSILON &&
            Math.abs(space1.length - space2.length) < this.EPSILON &&
            Math.abs(space1.width - space2.width) < this.EPSILON) {
            return true;
        }

        return false;
    }

    mergeSpaces(space1, space2) {
        return {
            x: Math.min(space1.x, space2.x),
            y: Math.min(space1.y, space2.y),
            z: Math.min(space1.z, space2.z),
            length: Math.max(space1.x + space1.length, space2.x + space2.length) - 
                   Math.min(space1.x, space2.x),
            width: Math.max(space1.y + space1.width, space2.y + space2.width) - 
                  Math.min(space1.y, space2.y),
            height: Math.max(space1.z + space1.height, space2.z + space2.height) - 
                   Math.min(space1.z, space2.z)
        };
    }

    spacesOverlap(space1, space2) {
        return !(space1.x + space1.length <= space2.x + this.EPSILON ||
                 space2.x + space2.length <= space1.x + this.EPSILON ||
                 space1.y + space1.width <= space2.y + this.EPSILON ||
                 space2.y + space2.width <= space1.y + this.EPSILON ||
                 space1.z + space1.height <= space2.z + this.EPSILON ||
                 space2.z + space2.height <= space1.z + this.EPSILON);
    }

    getAllOrientations(item) {
        const orientations = [];
        const dims = [item.length, item.width, item.height];
        
        // Generate all 6 possible orientations
        const permutations = [
            [0, 1, 2], [0, 2, 1],
            [1, 0, 2], [1, 2, 0],
            [2, 0, 1], [2, 1, 0]
        ];

        for (const perm of permutations) {
            orientations.push({
                dimensions: {
                    length: dims[perm[0]],
                    width: dims[perm[1]],
                    height: dims[perm[2]]
                },
                rotation: this.getRotationFromPermutation(perm)
            });
        }

        return orientations;
    }

    getRotationFromPermutation(perm) {
        const rotationMap = {
            '012': { x: 0, y: 0, z: 0 },
            '021': { x: 90, y: 0, z: 0 },
            '102': { x: 0, y: 0, z: 90 },
            '120': { x: 0, y: 90, z: 0 },
            '201': { x: 90, y: 0, z: 90 },
            '210': { x: 90, y: 90, z: 0 }
        };
        
        return rotationMap[perm.join('')] || { x: 0, y: 0, z: 0 };
    }
}

// Export the algorithm
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedPackingAlgorithm;
}
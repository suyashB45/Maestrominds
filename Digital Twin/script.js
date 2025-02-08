let scene, camera, renderer, city;
let ground, water;
let isSimulating = false;
let currentTime = 0;
let waterLevel = 0;
let controls;
let elapsedTime = 0;
let timerInterval;

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ 
        canvas: document.getElementById('simulationCanvas'),
        antialias: true
    });
    renderer.setSize(document.getElementById('simulationCanvas').offsetWidth, 400);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Add OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 5;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;

    createCity();

    // Update initial camera position
    camera.position.set(20, 15, 20);
    camera.lookAt(scene.position);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 10, 10);
    scene.add(directionalLight);

    animate();
}

function createCity() {
    // Create ground with better texture
    const groundGeometry = new THREE.PlaneGeometry(20, 20, 50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7cba3d,
        roughness: 0.8,
        metalness: 0.2
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Add parks
    createParks();

    // Create water plane (initially hidden)
    const waterGeometry = new THREE.PlaneGeometry(20, 20);
    const waterMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x0077be,
        transparent: true,
        opacity: 0.6
    });
    water = new THREE.Mesh(waterGeometry, waterMaterial);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.1;
    water.visible = false;
    scene.add(water);

    // Enhanced lighting
    addCityLights();

    // Create buildings with more realistic properties
    city = new THREE.Group();
    for (let i = 0; i < 50; i++) {
        // Skip building creation if location is within a park
        const x = Math.random() * 16 - 8;
        const z = Math.random() * 16 - 8;
        if (isInPark(x, z)) continue;

        const height = Math.random() * 3 + 1;
        const width = Math.random() * 0.5 + 0.5;
        const depth = Math.random() * 0.5 + 0.5;
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const material = new THREE.MeshStandardMaterial({ color: 0x8c8c8c });
        const building = new THREE.Mesh(geometry, material);
        
        building.position.x = x;
        building.position.z = z;
        building.position.y = height / 2;
        
        // Add physical properties
        building.userData = {
            height: height,
            width: width,
            depth: depth,
            population: Math.floor(Math.random() * 100),
            structuralIntegrity: 1.0,
            damageThreshold: Math.random() * 0.3 + 0.5, // Random threshold between 0.5 and 0.8
            originalPosition: building.position.clone(),
            originalRotation: building.rotation.clone()
        };
        
        city.add(building);
    }

    // Add trees
    addTrees();

    scene.add(city);
}

function createParks() {
    const parkGeometry = new THREE.PlaneGeometry(4, 4);
    const parkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x90EE90,
        roughness: 0.8
    });

    // Create 2-3 parks in different locations
    const parkLocations = [
        { x: -6, z: -6 },
        { x: 5, z: 5 },
        { x: -4, z: 4 }
    ];

    parkLocations.forEach(loc => {
        const park = new THREE.Mesh(parkGeometry, parkMaterial);
        park.rotation.x = -Math.PI / 2;
        park.position.set(loc.x, 0.01, loc.z); // Slightly above ground
        scene.add(park);
    });
}

function addTrees() {
    // Create more detailed tree geometries
    const treeGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
    const treeMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x228B22,
        roughness: 0.8,
        metalness: 0.1
    });
    
    const trunkGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.5, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        roughness: 1.0,
        metalness: 0.0
    });

    // Add trees with different sizes and rotations
    for (let i = 0; i < 100; i++) {
        const x = Math.random() * 18 - 9;
        const z = Math.random() * 18 - 9;

        // Skip if too close to buildings or not near parks
        if (isTooCloseToBuildings(x, z)) continue;
        
        // Higher density near parks
        const nearPark = isNearPark(x, z, 3); // 3 units radius around parks
        if (!nearPark && Math.random() > 0.3) continue; // 70% skip if not near park

        const treeGroup = new THREE.Group();

        // Random scale for variety
        const scale = 0.7 + Math.random() * 0.6;
        
        // Create trunk
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 0.25 * scale;
        trunk.scale.set(scale, scale, scale);
        treeGroup.add(trunk);

        // Create multiple foliage layers for fuller trees
        const foliageLayers = 2 + Math.floor(Math.random() * 2);
        for (let j = 0; j < foliageLayers; j++) {
            const foliage = new THREE.Mesh(treeGeometry, treeMaterial);
            foliage.position.y = (0.8 + j * 0.4) * scale;
            foliage.scale.set(
                scale * (1 - j * 0.15),
                scale * (1 - j * 0.1),
                scale * (1 - j * 0.15)
            );
            // Slight random rotation for natural look
            foliage.rotation.y = Math.random() * Math.PI * 2;
            treeGroup.add(foliage);
        }

        // Slight random rotation for variety
        treeGroup.rotation.y = Math.random() * Math.PI * 2;
        // Slight random tilt
        treeGroup.rotation.x = (Math.random() - 0.5) * 0.1;
        treeGroup.rotation.z = (Math.random() - 0.5) * 0.1;

        treeGroup.position.set(x, 0, z);
        
        // Add to scene and store reference for disaster effects
        treeGroup.userData.isTree = true;
        scene.add(treeGroup);
    }
}

function isNearPark(x, z, radius) {
    const parkLocations = [
        { x: -6, z: -6 },
        { x: 5, z: 5 },
        { x: -4, z: 4 }
    ];

    return parkLocations.some(park => {
        const dx = x - park.x;
        const dz = z - park.z;
        return Math.sqrt(dx * dx + dz * dz) < radius;
    });
}

function addCityLights() {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Main directional light (sun)
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(10, 20, 10);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // Add point lights for street lighting
    const streetLights = [
        { x: -5, z: -5 },
        { x: 5, z: 5 },
        { x: -5, z: 5 },
        { x: 5, z: -5 },
        { x: 0, z: 0 }
    ];

    streetLights.forEach(pos => {
        const light = new THREE.PointLight(0xFFD700, 0.6, 8);
        light.position.set(pos.x, 3, pos.z);
        scene.add(light);
    });
}

function isInPark(x, z) {
    // Check if position is within any park area
    const parkAreas = [
        { x: -6, z: -6, size: 2 },
        { x: 5, z: 5, size: 2 },
        { x: -4, z: 4, size: 2 }
    ];

    return parkAreas.some(park => 
        Math.abs(x - park.x) < park.size && 
        Math.abs(z - park.z) < park.size
    );
}

function isTooCloseToBuildings(x, z) {
    return city.children.some(building => {
        const dx = building.position.x - x;
        const dz = building.position.z - z;
        return Math.sqrt(dx * dx + dz * dz) < 1;
    });
}

function animate() {
    requestAnimationFrame(animate);
    if (isSimulating) {
        updateSimulation();
    }
    controls.update();
    renderer.render(scene, camera);
}

function startSimulation() {
    isSimulating = true;
    currentTime = 0;
    elapsedTime = 0;
    const disasterType = document.getElementById('disasterType').value;
    const intensity = document.getElementById('intensity').value;
    
    // Show water for flood and tsunami
    water.visible = ['flood', 'tsunami'].includes(disasterType);
    
    document.getElementById('alertPanel').style.display = 'block';
    document.getElementById('alertMessage').textContent = 
        `${disasterType.charAt(0).toUpperCase() + disasterType.slice(1)} simulation started with intensity ${intensity}`;
    
    // Reset building properties
    city.children.forEach(building => {
        building.userData.structuralIntegrity = 1.0;
        building.position.copy(building.userData.originalPosition);
        building.rotation.copy(building.userData.originalRotation);
    });
    
    // Start timer
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    
    updateStats();
}

function pauseSimulation() {
    isSimulating = !isSimulating;
    if (!isSimulating) {
        clearInterval(timerInterval);
    } else {
        timerInterval = setInterval(updateTimer, 1000);
    }
}

function resetSimulation() {
    isSimulating = false;
    currentTime = 0;
    elapsedTime = 0;
    clearInterval(timerInterval);
    updateTimer();
    waterLevel = 0;
    water.position.y = -0.1;
    water.visible = false;
    resetStats();
    
    city.children.forEach(building => {
        building.userData.structuralIntegrity = 1.0;
        building.position.copy(building.userData.originalPosition);
        building.rotation.copy(building.userData.originalRotation);
        building.material.color.setHex(0x8c8c8c);
    });
    
    ground.material.color.setHex(0x7cba3d);
}

function updateSimulation() {
    currentTime += 0.1;
    const intensity = parseInt(document.getElementById('intensity').value);
    const disasterType = document.getElementById('disasterType').value;
    
    switch(disasterType) {
        case 'flood':
            simulateFlood(intensity);
            break;
        case 'earthquake':
            simulateEarthquake(intensity);
            break;
        case 'tsunami':
            simulateTsunami(intensity);
            break;
        case 'volcano':
            simulateVolcano(intensity);
            break;
    }
    
    // Add tree updates during disasters
    updateTreesInDisaster(disasterType, intensity);
    
    updateStats();
}

function simulateFlood(intensity) {
    // Calculate water level based on intensity and time
    waterLevel = (Math.sin(currentTime * 0.2) + 1) * (intensity / 10) * 2;
    water.position.y = waterLevel;
    water.material.opacity = 0.6 + Math.sin(currentTime) * 0.1;
    
    // Change ground color based on saturation
    const saturation = Math.min(waterLevel / 2, 1);
    ground.material.color.setRGB(0.486 - saturation * 0.2, 0.731 - saturation * 0.3, 0.241);
    
    city.children.forEach(building => {
        const buildingBase = building.position.y - building.userData.height / 2;
        const waterDepth = Math.max(0, waterLevel - buildingBase);
        
        if (waterDepth > 0) {
            // Calculate structural damage based on water pressure
            const pressure = waterDepth * 0.1;
            building.userData.structuralIntegrity = Math.max(
                0,
                building.userData.structuralIntegrity - pressure * 0.001
            );
            
            // Visual feedback
            const damage = 1 - building.userData.structuralIntegrity;
            building.material.color.setRGB(
                0.5 + damage * 0.2,
                0.5 + damage * 0.1,
                0.6 + damage * 0.2
            );
        }
    });
}

function simulateEarthquake(intensity) {
    const time = currentTime * 5;
    const maxShake = intensity * 0.15;
    
    city.children.forEach(building => {
        const distance = new THREE.Vector2(building.position.x, building.position.z).length();
        const phaseShift = distance * 0.5;
        
        // Calculate seismic waves
        const xWave = Math.sin(time + phaseShift) * maxShake;
        const zWave = Math.cos(time + phaseShift) * maxShake;
        
        // Apply building physics
        const originalPos = building.userData.originalPosition;
        const height = building.userData.height;
        
        // Taller buildings are affected more by earthquakes
        const heightFactor = height / 4;
        
        building.position.x = originalPos.x + xWave * heightFactor;
        building.position.z = originalPos.z + zWave * heightFactor;
        
        // Add building sway
        building.rotation.y = Math.sin(time * 2 + phaseShift) * 0.02 * intensity * heightFactor;
        building.rotation.x = Math.cos(time * 2 + phaseShift) * 0.02 * intensity * heightFactor;
        
        // Calculate structural damage
        const stress = (Math.abs(xWave) + Math.abs(zWave)) * heightFactor;
        if (stress > building.userData.damageThreshold) {
            building.userData.structuralIntegrity = Math.max(
                0,
                building.userData.structuralIntegrity - 0.001 * intensity
            );
        }
        
        // Visual feedback for damage
        const damage = 1 - building.userData.structuralIntegrity;
        building.material.color.setRGB(
            0.55 + damage * 0.45,
            0.55 - damage * 0.25,
            0.55 - damage * 0.25
        );
    });
}

function simulateTsunami(intensity) {
    // Calculate tsunami wave properties
    const waveHeight = (Math.sin(currentTime * 0.5) + 1) * (intensity / 5) * 4;
    const waveSpeed = intensity * 0.2;
    
    // Update water level with more dramatic movement
    waterLevel = waveHeight;
    water.position.y = waterLevel;
    water.material.opacity = 0.7 + Math.sin(currentTime * waveSpeed) * 0.2;
    
    // Change ground color based on water damage
    const saturation = Math.min(waterLevel / 3, 1);
    ground.material.color.setRGB(0.486 - saturation * 0.3, 0.731 - saturation * 0.4, 0.241);
    
    city.children.forEach(building => {
        const buildingBase = building.position.y - building.userData.height / 2;
        const waterImpact = Math.max(0, waterLevel - buildingBase);
        
        if (waterImpact > 0) {
            // Calculate damage based on wave impact
            const impactForce = waterImpact * waveSpeed * 0.15;
            building.userData.structuralIntegrity = Math.max(
                0,
                building.userData.structuralIntegrity - impactForce * 0.005
            );
            
            // Add swaying motion to buildings
            const sway = Math.sin(currentTime * waveSpeed) * 0.1 * intensity;
            building.rotation.z = sway;
            
            // Visual feedback
            const damage = 1 - building.userData.structuralIntegrity;
            building.material.color.setRGB(
                0.4 + damage * 0.3,
                0.4 + damage * 0.1,
                0.5 + damage * 0.3
            );
        }
    });
}

function simulateVolcano(intensity) {
    const volcanoCenter = new THREE.Vector2(0, 0);
    const maxRadius = 15;
    const lavaSpread = (currentTime * 0.1) % maxRadius;
    
    city.children.forEach(building => {
        const buildingPosition = new THREE.Vector2(
            building.position.x,
            building.position.z
        );
        const distanceFromCenter = buildingPosition.distanceTo(volcanoCenter);
        
        // Calculate lava effect
        if (distanceFromCenter < lavaSpread) {
            const heatDamage = (1 - distanceFromCenter / maxRadius) * intensity * 0.01;
            building.userData.structuralIntegrity = Math.max(
                0,
                building.userData.structuralIntegrity - heatDamage
            );
            
            // Visual feedback - buildings get redder as they heat up
            const damage = 1 - building.userData.structuralIntegrity;
            building.material.color.setRGB(
                0.8 + damage * 0.2,
                0.2 - damage * 0.2,
                0.2 - damage * 0.2
            );
            
            // Add melting effect
            building.scale.y = Math.max(0.1, building.userData.structuralIntegrity);
            building.position.y = building.userData.originalPosition.y * building.scale.y;
        }
        
        // Add ash effect to ground
        const groundDarkness = Math.min(lavaSpread / maxRadius, 1);
        ground.material.color.setRGB(
            0.3 - groundDarkness * 0.2,
            0.3 - groundDarkness * 0.2,
            0.3 - groundDarkness * 0.2
        );
    });
    
    // Add smoke effect (if you want to add particle effects later)
    // This would require implementing a particle system
}

function updateTreesInDisaster(disasterType, intensity) {
    scene.children.forEach(object => {
        if (object.userData.isTree) {
            switch(disasterType) {
                case 'flood':
                case 'tsunami':
                    // Trees sway in water
                    const sway = Math.sin(currentTime * 2) * 0.1 * intensity;
                    object.rotation.x = sway;
                    object.rotation.z = sway;
                    break;
                    
                case 'earthquake':
                    // Trees shake during earthquake
                    object.rotation.x = (Math.random() - 0.5) * 0.1 * intensity;
                    object.rotation.z = (Math.random() - 0.5) * 0.1 * intensity;
                    break;
                    
                case 'volcano':
                    // Trees burn near volcano
                    const distanceFromCenter = new THREE.Vector2(
                        object.position.x,
                        object.position.z
                    ).length();
                    const maxRadius = 15;
                    const lavaSpread = (currentTime * 0.1) % maxRadius;
                    
                    if (distanceFromCenter < lavaSpread) {
                        // Change color to burnt
                        object.children.forEach(child => {
                            if (child.material.color.r < 0.4) { // If it's a foliage
                                child.material.color.setRGB(0.2, 0.1, 0);
                            }
                        });
                    }
                    break;
            }
        }
    });
}

function updateStats() {
    const intensity = parseInt(document.getElementById('intensity').value);
    let affectedCount = 0;
    let totalAffectedPopulation = 0;
    
    city.children.forEach(building => {
        if (building.userData.structuralIntegrity < 0.9) {
            affectedCount++;
            totalAffectedPopulation += Math.floor(
                building.userData.population * (1 - building.userData.structuralIntegrity)
            );
        }
    });
    
    const routes = Math.floor(intensity * 2);
    
    document.getElementById('affectedBuildings').textContent = affectedCount;
    document.getElementById('evacuationRoutes').textContent = routes;
    document.getElementById('affectedPopulation').textContent = totalAffectedPopulation.toLocaleString();
    document.getElementById('riskLevel').textContent = 
        intensity > 7 ? 'High' : intensity > 4 ? 'Medium' : 'Low';
}

function resetStats() {
    document.getElementById('affectedBuildings').textContent = '0';
    document.getElementById('evacuationRoutes').textContent = '0';
    document.getElementById('affectedPopulation').textContent = '0';
    document.getElementById('riskLevel').textContent = 'Low';
    document.getElementById('alertPanel').style.display = 'none';
}

// Initialize intensity value display
document.getElementById('intensity').addEventListener('input', function(e) {
    document.getElementById('intensityValue').textContent = e.target.value;
});

// Handle window resize
window.addEventListener('resize', function() {
    const canvas = document.getElementById('simulationCanvas');
    const width = canvas.offsetWidth;
    const height = 400;
    
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
});

// Add these camera control functions
function setTopView() {
    gsapCamera(0, 25, 0, 0, 0, 0);
}

function setIsometricView() {
    gsapCamera(20, 15, 20, 0, 0, 0);
}

function setStreetView() {
    gsapCamera(5, 2, 5, 0, 0, 0);
}

// Helper function for smooth camera transitions
function gsapCamera(x, y, z, targetX, targetY, targetZ) {
    const duration = 1.0;
    const ease = 'power2.inOut';
    
    // Disable controls during transition
    controls.enabled = false;
    
    // Animate camera position
    const tl = gsap.timeline({
        onComplete: () => {
            controls.enabled = true;
        }
    });
    
    tl.to(camera.position, {
        duration: duration,
        ease: ease,
        x: x,
        y: y,
        z: z
    });

    // Animate camera target
    tl.to(controls.target, {
        duration: duration,
        ease: ease,
        x: targetX,
        y: targetY,
        z: targetZ
    }, 0);
}

function updateTimer() {
    if (isSimulating) {
        elapsedTime++;
        const hours = Math.floor(elapsedTime / 3600);
        const minutes = Math.floor((elapsedTime % 3600) / 60);
        const seconds = elapsedTime % 60;
        
        document.getElementById('simulationTime').textContent = 
            `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
}

// Initialize the scene
init();
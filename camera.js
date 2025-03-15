// camera.js - Advanced Camera Module with Spline/Bezier and Kaprekar-driven paths
// Core Vector3 implementation for 3D operations


class Vector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  
    clone() {
      return new Vector3(this.x, this.y, this.z);
    }
  
    copy(v) {
      this.x = v.x;
      this.y = v.y;
      this.z = v.z;
      return this;
    }
  
    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    
    add(v) {
      this.x += v.x;
      this.y += v.y;
      this.z += v.z;
      return this;
    }
    
    sub(v) {
      this.x -= v.x;
      this.y -= v.y;
      this.z -= v.z;
      return this;
    }
    
    multiplyScalar(scalar) {
      this.x *= scalar;
      this.y *= scalar;
      this.z *= scalar;
      return this;
    }
    
    length() {
      return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    normalize() {
      const len = this.length();
      if (len > 0) {
        this.multiplyScalar(1 / len);
      }
      return this;
    }
  }
  
    
    // Quaternion for smooth rotation interpolation
    class Quaternion {
      constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
      }
    
      clone() {
        return new Quaternion(this.x, this.y, this.z, this.w);
      }
    
      set(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
        return this;
      }
    
      setFromEuler(x, y, z) {
        // Convert Euler angles to quaternion
        const c1 = Math.cos(x / 2);
        const c2 = Math.cos(y / 2);
        const c3 = Math.cos(z / 2);
        const s1 = Math.sin(x / 2);
        const s2 = Math.sin(y / 2);
        const s3 = Math.sin(z / 2);
    
        this.x = s1 * c2 * c3 + c1 * s2 * s3;
        this.y = c1 * s2 * c3 - s1 * c2 * s3;
        this.z = c1 * c2 * s3 + s1 * s2 * c3;
        this.w = c1 * c2 * c3 - s1 * s2 * s3;
    
        return this;
      }
    
      toEuler() {
        // Convert quaternion to Euler angles
        const ysqr = this.y * this.y;
        
        // Roll (x-axis rotation)
        const t0 = 2 * (this.w * this.x + this.y * this.z);
        const t1 = 1 - 2 * (this.x * this.x + ysqr);
        const roll = Math.atan2(t0, t1);
        
        // Pitch (y-axis rotation)
        let t2 = 2 * (this.w * this.y - this.z * this.x);
        t2 = t2 > 1 ? 1 : t2;
        t2 = t2 < -1 ? -1 : t2;
        const pitch = Math.asin(t2);
        
        // Yaw (z-axis rotation)
        const t3 = 2 * (this.w * this.z + this.x * this.y);
        const t4 = 1 - 2 * (ysqr + this.z * this.z);
        const yaw = Math.atan2(t3, t4);
        
        return { x: roll, y: pitch, z: yaw };
      }
    
      // SLERP - Spherical Linear Interpolation for quaternions
      slerp(qb, t) {
        if (t === 0) return this;
        if (t === 1) return this.copy(qb);
    
        const x = this.x, y = this.y, z = this.z, w = this.w;
        let cosHalfTheta = w * qb.w + x * qb.x + y * qb.y + z * qb.z;
    
        if (cosHalfTheta < 0) {
          this.w = -qb.w;
          this.x = -qb.x;
          this.y = -qb.y;
          this.z = -qb.z;
          cosHalfTheta = -cosHalfTheta;
        } else {
          this.copy(qb);
        }
    
        if (cosHalfTheta >= 1.0) {
          this.w = w;
          this.x = x;
          this.y = y;
          this.z = z;
          return this;
        }
    
        const halfTheta = Math.acos(cosHalfTheta);
        const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
    
        if (Math.abs(sinHalfTheta) < 0.001) {
          this.w = 0.5 * (w + this.w);
          this.x = 0.5 * (x + this.x);
          this.y = 0.5 * (y + this.y);
          this.z = 0.5 * (z + this.z);
          return this;
        }
    
        const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
        const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
    
        this.w = (w * ratioA + this.w * ratioB);
        this.x = (x * ratioA + this.x * ratioB);
        this.y = (y * ratioA + this.y * ratioB);
        this.z = (z * ratioA + this.z * ratioB);
    
        return this;
      }
    
      copy(q) {
        this.x = q.x;
        this.y = q.y;
        this.z = q.z;
        this.w = q.w;
        return this;
      }
    }
    
    // Interpolation functions
    const Interpolation = {
      // Linear interpolation (lerp)
      lerp: (a, b, t) => a + (b - a) * t,
      
      // Catmull-Rom spline interpolation for a single value
      catmullRomValue: (p0, p1, p2, p3, t) => {
        const t2 = t * t;
        const t3 = t2 * t;
        
        return 0.5 * (
          (2 * p1) +
          (-p0 + p2) * t +
          (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
          (-p0 + 3 * p1 - 3 * p2 + p3) * t3
        );
      },
      
      // Cubic Bezier interpolation for a single value
      cubicBezierValue: (p0, p1, p2, p3, t) => {
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        
        return mt3 * p0 + 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3 * p3;
      },
      
      // Vector3 interpolation using Catmull-Rom spline
      catmullRomPoint: (controlPoints, t) => {
        if (controlPoints.length < 4) {
          throw new Error("Catmull-Rom interpolation requires at least 4 control points");
        }
        
        // Find the segment we're in
        const segments = controlPoints.length - 3;
        const segment = Math.min(Math.floor(t * segments), segments - 1);
        
        // Normalize t to the segment
        const segmentT = (t * segments) - segment;
        
        const p0 = controlPoints[segment];
        const p1 = controlPoints[segment + 1];
        const p2 = controlPoints[segment + 2];
        const p3 = controlPoints[segment + 3];
        
        return new Vector3(
          Interpolation.catmullRomValue(p0.x, p1.x, p2.x, p3.x, segmentT),
          Interpolation.catmullRomValue(p0.y, p1.y, p2.y, p3.y, segmentT),
          Interpolation.catmullRomValue(p0.z, p1.z, p2.z, p3.z, segmentT)
        );
      },
      
      // Vector3 interpolation using Cubic Bezier
      cubicBezierPoint: (p0, p1, p2, p3, t) => {
        return new Vector3(
          Interpolation.cubicBezierValue(p0.x, p1.x, p2.x, p3.x, t),
          Interpolation.cubicBezierValue(p0.y, p1.y, p2.y, p3.y, t),
          Interpolation.cubicBezierValue(p0.z, p1.z, p2.z, p3.z, t)
        );
      },
      
      // Interpolate a series of Bezier curves defined by control points
      bezierSpline: (controlPoints, t) => {
        if (controlPoints.length < 4) {
          throw new Error("Bezier spline interpolation requires at least 4 control points");
        }
        
        if (controlPoints.length % 3 !== 1) {
          throw new Error("Bezier spline control points must be in multiples of 3 plus 1");
        }
        
        const curveCount = (controlPoints.length - 1) / 3;
        const curve = Math.min(Math.floor(t * curveCount), curveCount - 1);
        const curveT = (t * curveCount) - curve;
        
        const idx = curve * 3;
        return Interpolation.cubicBezierPoint(
          controlPoints[idx],
          controlPoints[idx + 1],
          controlPoints[idx + 2],
          controlPoints[idx + 3],
          curveT
        );
      }
    };
    
    // Kaprekar Routine implementation
    const Kaprekar = {
      // Performs the Kaprekar routine on a 4-digit number
      performKaprekarRoutine: (num) => {
        // Ensure 4 digits by padding with zeros
        let numStr = num.toString().padStart(4, '0');
        
        // Ensure we have exactly 4 digits
        if (numStr.length > 4) numStr = numStr.substring(0, 4);
        
        // Sort the digits in ascending and descending order
        const ascending = numStr.split('').sort().join('');
        const descending = numStr.split('').sort((a, b) => b - a).join('');
        
        // Subtract the smaller from the larger
        const result = parseInt(descending) - parseInt(ascending);
        
        return result;
      },
      
      // Generates a sequence of numbers based on the Kaprekar routine
      generateKaprekarSequence: (seed, length) => {
        const sequence = [seed];
        
        for (let i = 1; i < length; i++) {
          const nextNum = Kaprekar.performKaprekarRoutine(sequence[i - 1]);
          sequence.push(nextNum);
          
          // Check for repeating pattern (6174 is a known Kaprekar constant)
          if (nextNum === 6174 || nextNum === 0) {
            break;
          }
        }
        
        return sequence;
      },
      
      // Maps Kaprekar routine output to a 3D direction vector
      mapToDirection: (kaprekarNum) => {
        const digits = kaprekarNum.toString().padStart(4, '0').split('').map(Number);
        
        // Map the first two digits to spherical coordinates
        const theta = (digits[0] / 9) * Math.PI * 2; // Azimuth angle
        const phi = (digits[1] / 9) * Math.PI; // Polar angle
        
        // Convert spherical to Cartesian coordinates
        const magnitude = (digits[2] + digits[3]) / 18 + 0.5; // Range 0.5 to 1.5
        
        return new Vector3(
          magnitude * Math.sin(phi) * Math.cos(theta),
          magnitude * Math.sin(phi) * Math.sin(theta),
          magnitude * Math.cos(phi)
        );
      },
      
      // Generate control points influenced by a Kaprekar sequence
      generateKaprekarControlPoints: (startPoint, count, seed, scale = 1) => {
        const sequence = Kaprekar.generateKaprekarSequence(seed, count);
        const points = [startPoint.clone()];
        
        // Use the Kaprekar sequence to influence the generation of points
        for (let i = 0; i < count - 1; i++) {
          const direction = Kaprekar.mapToDirection(sequence[i % sequence.length]);
          direction.multiplyScalar(scale);
          
          const newPoint = points[i].clone().add(direction);
          points.push(newPoint);
        }
        
        return points;
      }
    };
    
    // Main Camera class
    class Camera {
      constructor(fov = 75, aspect = window.innerWidth / window.innerHeight, near = 0.1, far = 1000) {
        this.position = new Vector3();
        this.rotation = new Vector3();
        this.quaternion = new Quaternion();
        this.up = new Vector3(0, 1, 0);
        this.target = new Vector3();
        
        // Perspective parameters
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.zoom = 1;
        
        // Path following state
        this.mode = 'manual'; // 'manual' or 'path'
        this.pathProgress = 0;
        this.pathDuration = 10000; // Default duration in ms
        this.pathStartTime = 0;
        
        // Create an initial projection matrix
        this.updateProjectionMatrix();
      }
      
      setPosition(x, y, z) {
        this.position.set(x, y, z);
        return this;
      }
      
      setRotation(x, y, z) {
        this.rotation.set(x, y, z);
        this.quaternion.setFromEuler(x, y, z);
        return this;
      }
      
      setQuaternion(q) {
        this.quaternion.copy(q);
        const euler = this.quaternion.toEuler();
        this.rotation.set(euler.x, euler.y, euler.z);
        return this;
      }
      
      lookAt(targetX, targetY, targetZ) {
        if (targetX instanceof Vector3) {
          this.target.copy(targetX);
        } else {
          this.target.set(targetX, targetY, targetZ);
        }
        
        // Calculate direction from position to target
        const direction = new Vector3().copy(this.target).sub(this.position).normalize();
        
        // Calculate rotation from direction
        const pitch = -Math.asin(direction.y);
        const yaw = Math.atan2(direction.x, direction.z);
        
        this.setRotation(0, pitch, yaw);
        return this;
      }
      
      updateProjectionMatrix() {
        // This would update the projection matrix for rendering
        // Implementation will depend on your rendering system
        console.log("Projection matrix updated", {
          fov: this.fov,
          aspect: this.aspect,
          near: this.near,
          far: this.far,
          zoom: this.zoom
        });
        return this;
      }
      
    // Sets the zoom (focal length) and updates the projection.
    setZoom(zoom) {
      this.zoom = zoom;
      this.updateProjectionMatrix();
      return this;
    }
  
    // Projects a 3D point into 2D camera space.
    // For simplicity, we subtract the camera's position, rotate by the inverse camera orientation,
    // and then apply a perspective divide using this.zoom as the focal length.
    project(point) {
      // Translate point relative to the camera.
      const translated = new Vector3(
        point.x - this.position.x,
        point.y - this.position.y,
        point.z - this.position.z
      );
  
      // To "undo" the camera rotation, we can apply the inverse of the camera quaternion.
      // A simple way is to negate the vector part of the quaternion:
      const invQ = new Quaternion(-this.quaternion.x, -this.quaternion.y, -this.quaternion.z, this.quaternion.w);
      // Use a helper function (like our global rotateVectorByQuaternion) to rotate.
      const rotated = rotateVectorByQuaternion(translated, invQ);
  
      // Apply perspective projection. Assume focal length f = this.zoom.
      if (rotated.z <= 0) return null; // Point is behind the camera.
      const f = this.zoom;
      const x = (rotated.x * f) / rotated.z;
      const y = (rotated.y * f) / rotated.z;
      return { x, y, depth: rotated.z };
    }
  
    // Temporarily focus on a target by switching to manual mode, then resuming the previous mode.
    temporaryFocus(target, duration) {
      const prevMode = this.mode;
      this.stopPath();
      this.lookAt(target);
      setTimeout(() => {
        if (prevMode === 'path' && this.positionPath && this.rotationPath) {
          this.startPath(this.positionPath, this.rotationPath, this.pathDuration, this.perspectiveCurve);
        }
      }, duration);
    }
  
      // Update the camera along a path
      updateAlongPath(t, positionControlPoints, rotationControlPoints, perspectiveCurve) {
        // Compute new position using spline interpolation
        let newPos;
        if (positionControlPoints.length >= 4) {
          // Use Catmull-Rom or Bezier depending on the control point structure
          if (positionControlPoints.length % 3 === 1) {
            newPos = Interpolation.bezierSpline(positionControlPoints, t);
          } else {
            newPos = Interpolation.catmullRomPoint(positionControlPoints, t);
          }
          this.setPosition(newPos.x, newPos.y, newPos.z);
        }
        
        // Handle rotation (can be either Euler angles or quaternions)
        if (rotationControlPoints && rotationControlPoints.length > 0) {
          if (rotationControlPoints[0] instanceof Quaternion) {
            // Quaternion rotation for smoother camera rotations
            const segments = rotationControlPoints.length - 1;
            const segment = Math.min(Math.floor(t * segments), segments - 1);
            const segmentT = (t * segments) - segment;
            
            const qa = rotationControlPoints[segment];
            const qb = rotationControlPoints[segment + 1];
            
            const newRot = new Quaternion().copy(qa).slerp(qb, segmentT);
            this.setQuaternion(newRot);
          } else if (rotationControlPoints[0] instanceof Vector3) {
            // Euler angle rotation using the same interpolation as position
            let newRot;
            if (rotationControlPoints.length >= 4) {
              if (rotationControlPoints.length % 3 === 1) {
                newRot = Interpolation.bezierSpline(rotationControlPoints, t);
              } else {
                newRot = Interpolation.catmullRomPoint(rotationControlPoints, t);
              }
              this.setRotation(newRot.x, newRot.y, newRot.z);
            }
          }
        }
        
        // Update perspective (zoom) if a curve function is provided
        if (perspectiveCurve) {
          this.zoom = perspectiveCurve(t);
          this.updateProjectionMatrix();
        }
        
        return this;
      }
      
      // Start following a defined path
      startPath(positionPath, rotationPath, duration, perspectiveCurve) {
        this.mode = 'path';
        this.positionPath = positionPath;
        this.rotationPath = rotationPath;
        this.pathDuration = duration || 10000;
        this.perspectiveCurve = perspectiveCurve;
        this.pathStartTime = performance.now();
        return this;
      }
      
      // Switch back to manual control
      stopPath() {
        this.mode = 'manual';
        return this;
      }
      
      // Main update method that handles both manual and path modes
      update(deltaTime) {
        if (this.mode === 'path') {
          const elapsed = performance.now() - this.pathStartTime;
          const t = (elapsed % this.pathDuration) / this.pathDuration;
          
          this.updateAlongPath(t, this.positionPath, this.rotationPath, this.perspectiveCurve);
        }
        // In manual mode, update would be handled by the CameraController
        
        return this;
      }
    }
    
    // Camera controller for handling user input
    class CameraController {
      constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || document;
        
        // Movement and rotation speed
        this.movementSpeed = 5.0;
        this.rotationSpeed = 0.002;
        
        // Input state
        this.keys = {};
        this.mouseDown = false;
        this.previousMouseX = 0;
        this.previousMouseY = 0;
        
        // Bind event listeners
        this.bindEvents();
      }
      
      bindEvents() {
        // Keyboard events
        this.domElement.addEventListener('keydown', (e) => { this.keys[e.code] = true; });
        this.domElement.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
        
        // Mouse events for camera rotation
        this.domElement.addEventListener('mousedown', (e) => {
          this.mouseDown = true;
          this.previousMouseX = e.clientX;
          this.previousMouseY = e.clientY;
        });
        
        this.domElement.addEventListener('mouseup', () => {
          this.mouseDown = false;
        });
        
        this.domElement.addEventListener('mousemove', (e) => {
          if (this.mouseDown && this.camera.mode === 'manual') {
            const deltaX = e.clientX - this.previousMouseX;
            const deltaY = e.clientY - this.previousMouseY;
            
            this.camera.rotation.z -= deltaX * this.rotationSpeed;
            this.camera.rotation.y -= deltaY * this.rotationSpeed;
            
            this.camera.quaternion.setFromEuler(
              this.camera.rotation.x,
              this.camera.rotation.y,
              this.camera.rotation.z
            );
            
            this.previousMouseX = e.clientX;
            this.previousMouseY = e.clientY;
          }
        });
        
        // Prevent context menu on right-click
        this.domElement.addEventListener('contextmenu', (e) => {
          e.preventDefault();
        });
      }
      
      update(deltaTime) {
        // Only process input in manual mode
        if (this.camera.mode !== 'manual') return;
        
        const moveSpeed = this.movementSpeed * (deltaTime || 1/60);
        
        // Calculate movement vector based on camera orientation
        const forward = new Vector3(0, 0, -1);
        const right = new Vector3(1, 0, 0);
        
        // Apply rotation to get world-space direction vectors
        // In a real implementation, you'd use matrix rotation here
        
        // Process keyboard input for movement
        if (this.keys['KeyW']) {
          this.camera.position.z -= moveSpeed;
        }
        if (this.keys['KeyS']) {
          this.camera.position.z += moveSpeed;
        }
        if (this.keys['KeyA']) {
          this.camera.position.x -= moveSpeed;
        }
        if (this.keys['KeyD']) {
          this.camera.position.x += moveSpeed;
        }
        if (this.keys['Space']) {
          this.camera.position.y += moveSpeed;
        }
        if (this.keys['ShiftLeft']) {
          this.camera.position.y -= moveSpeed;
        }
        
        return this;
      }
      
      // Toggle between manual and path modes
      toggleMode() {
        if (this.camera.mode === 'manual') {
          // Only start the path if it's been defined
          if (this.camera.positionPath && this.camera.rotationPath) {
            this.camera.mode = 'path';
            this.camera.pathStartTime = performance.now();
          }
        } else {
          this.camera.mode = 'manual';
        }
        
        return this;
      }
    }
    
    // Path Generator for creating complex camera paths
    class PathGenerator {
      constructor() {
        // Default options
        this.pathType = 'bezier'; // 'bezier', 'catmullRom', 'kaprekar'
        this.pathSize = 10; // Number of control points
        this.pathScale = 10; // Scale of the path
        this.kaprekarSeed = 1998; // Initial seed for Kaprekar routine
      }
      
      setOptions(options) {
        if (options.pathType) this.pathType = options.pathType;
        if (options.pathSize) this.pathSize = options.pathSize;
        if (options.pathScale) this.pathScale = options.pathScale;
        if (options.kaprekarSeed) this.kaprekarSeed = options.kaprekarSeed;
        return this;
      }
      
      // Generate a simple circular path
      circularPath(radius = 10, center = new Vector3(0, 0, 0), pointCount = 8) {
        const points = [];
        
        for (let i = 0; i < pointCount; i++) {
          const angle = (i / pointCount) * Math.PI * 2;
          const x = center.x + radius * Math.cos(angle);
          const z = center.z + radius * Math.sin(angle);
          points.push(new Vector3(x, center.y, z));
        }
        
        return points;
      }
      
      // Generate a Bezier spline path
      bezierPath(start = new Vector3(0, 0, 0), controlPointCount = 9) {
        // For a bezier spline, we need 3n+1 points for n curves
        const points = [start.clone()];
        
        // Create random control points
        for (let i = 1; i < controlPointCount; i++) {
          const point = new Vector3(
            start.x + (Math.random() - 0.5) * this.pathScale * 2,
            start.y + (Math.random() - 0.5) * this.pathScale * 2,
            start.z + (Math.random() - 0.5) * this.pathScale * 2
          );
          points.push(point);
        }
        
        return points;
      }
      
      // Generate a path influenced by Kaprekar routine
      kaprekarPath(start = new Vector3(0, 0, 0), pointCount = 10) {
        return Kaprekar.generateKaprekarControlPoints(
          start,
          pointCount,
          this.kaprekarSeed,
          this.pathScale
        );
      }
      
      // Generate a path based on the selected type
      generatePath(startPoint = new Vector3(0, 0, 0)) {
        switch (this.pathType) {
          case 'bezier':
            return this.bezierPath(startPoint, this.pathSize);
          case 'catmullRom':
            // For Catmull-Rom, we generate a path and ensure we have at least 4 points
            const circPath = this.circularPath(this.pathScale, startPoint, Math.max(4, this.pathSize));
            return circPath;
          case 'kaprekar':
            return this.kaprekarPath(startPoint, this.pathSize);
          default:
            return this.circularPath(this.pathScale, startPoint, this.pathSize);
        }
      }
      
      // Generate quaternion rotations for smooth camera orientation changes
      generateRotationPath(positionPath, lookAhead = true) {
        const rotations = [];
        
        if (lookAhead && positionPath.length >= 2) {
          for (let i = 0; i < positionPath.length - 1; i++) {
            const currentPos = positionPath[i];
            const nextPos = positionPath[i + 1];
            
            // Create a direction vector from current to next position
            const direction = new Vector3()
              .copy(nextPos)
              .sub(currentPos)
              .normalize();
            
            // Calculate Euler angles from direction
            const pitch = -Math.asin(direction.y);
            const yaw = Math.atan2(direction.x, direction.z);
            
            // Create quaternion from Euler angles
            const q = new Quaternion().setFromEuler(0, pitch, yaw);
            rotations.push(q);
          }
          
          // Add final rotation (copy of the last one)
          rotations.push(rotations[rotations.length - 1].clone());
        } else {
          // If not looking ahead, create default rotations
          for (let i = 0; i < positionPath.length; i++) {
            rotations.push(new Quaternion());
          }
        }
        
        return rotations;
      }
    }
    
    // Usage example
    function setupCamera() {
      // Create a camera
      const camera = new Camera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.setPosition(0, 5, 10);
      camera.lookAt(0, 0, 0);
      
      // Create a camera controller
      const controller = new CameraController(camera, document);
      
      // Create a path generator
      const pathGen = new PathGenerator();
      pathGen.setOptions({
        pathType: 'kaprekar',
        pathSize: 12,
        pathScale: 15,
        kaprekarSeed: 1998
      });
      
      // Generate position and rotation paths
      const positionPath = pathGen.generatePath(camera.position.clone());
      const rotationPath = pathGen.generateRotationPath(positionPath, true);
      
      // Create a simple perspective curve (zoom effect)
      const perspectiveCurve = (t) => {
        // Oscillate between 0.8 and 1.2 zoom
        return 1 + 0.2 * Math.sin(t * Math.PI * 2);
      };
      
      // Setup animation loop
      let lastTime = performance.now();
      function animate() {
        const currentTime = performance.now();
        const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
        lastTime = currentTime;
        
        // Update camera based on its current mode
        controller.update(deltaTime);
        camera.update(deltaTime);
        
        // Render the scene (implementation depends on your rendering system)
        // renderer.render(scene, camera);
        
        requestAnimationFrame(animate);
      }
      
      // Add key handler for toggling between manual and path modes
      document.addEventListener('keydown', (e) => {
        if (e.code === 'KeyP') {
          if (camera.mode === 'manual') {
            // Start following the path
            camera.startPath(positionPath, rotationPath, 20000, perspectiveCurve);
          } else {
            // Switch back to manual control
            camera.stopPath();
          }
        }
      });
      
      // Start animation loop
      animate();
      
      return { camera, controller, pathGen };
    }
    
    // Export all classes for usage
    export {
      Vector3,
      Quaternion,
      Interpolation,
      Kaprekar,
      Camera,
      CameraController,
      PathGenerator,
      setupCamera
    };
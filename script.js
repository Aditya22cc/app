document.addEventListener('DOMContentLoaded', () => {
    const messageInput = document.getElementById('messageInput');
    const startButton = document.getElementById('startTransmit');
    const stopButton = document.getElementById('stopTransmit');
    const statusIndicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const binaryDisplay = document.getElementById('binaryDisplay');
    const messageElement = document.getElementById('message');

    let stream = null;
    let track = null;
    let transmissionInterval = null;
    let currentIndex = 0;
    let binaryMessage = '';

    // Check for browser compatibility
    if (!('mediaDevices' in navigator) || !('getUserMedia' in navigator.mediaDevices)) {
        showMessage('Your browser does not support accessing the camera/flashlight.');
        startButton.disabled = true;
        return;
    }

    function textToBinary(text) {
        return text.split('').map(char =>
            char.charCodeAt(0).toString(2).padStart(8, '0')
        ).join('');
    }

    function updateBinaryDisplay(fullBinary, currentPosition) {
        const displayText = fullBinary.split('').map((bit, index) =>
            `<span style="color: ${index === currentPosition ? '#ffd700' : '#666'}">${bit}</span>`
        ).join('');
        binaryDisplay.innerHTML = displayText;
    }

    async function toggleFlashlight(on) {
        if (!track) return;
        try {
            await track.applyConstraints({
                advanced: [{ torch: on }]
            });
            statusIndicator.classList.toggle('active', on);
        } catch (error) {
            console.error('Error toggling flashlight:', error);
        }
    }

    async function startTransmission() {
        const text = messageInput.value.trim();
        if (!text) {
            showMessage('Please enter a message to transmit.');
            return;
        }

        try {
            // Request camera access
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    advanced: [{ torch: true }]
                }
            });

            track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();

            if (!capabilities.torch) {
                throw new Error('Torch is not supported on this device');
            }

            // Prepare transmission
            binaryMessage = textToBinary(text);
            currentIndex = 0;
            updateBinaryDisplay(binaryMessage, currentIndex);

            // Update UI
            messageInput.disabled = true;
            startButton.disabled = true;
            stopButton.disabled = false;
            statusText.textContent = 'Transmitting...';
            showMessage('');

            // Start transmission
            transmissionInterval = setInterval(async () => {
                if (currentIndex >= binaryMessage.length) {
                    await stopTransmission();
                    showMessage('Transmission complete!');
                    return;
                }

                const bit = binaryMessage[currentIndex] === '1';
                await toggleFlashlight(bit);
                updateBinaryDisplay(binaryMessage, currentIndex);
                currentIndex++;
            }, 500); // 500ms per bit

        } catch (error) {
            console.error('Error:', error);
            showMessage(error.message || 'Failed to access the flashlight');
            await cleanup();
        }
    }

    async function stopTransmission() {
        await cleanup();
        showMessage('Transmission stopped.');
    }

    async function cleanup() {
        clearInterval(transmissionInterval);

        if (track) {
            await toggleFlashlight(false);
            track.stop();
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        // Reset state
        stream = null;
        track = null;
        currentIndex = 0;
        transmissionInterval = null;

        // Reset UI
        messageInput.disabled = false;
        startButton.disabled = false;
        stopButton.disabled = true;
        statusText.textContent = 'Ready to transmit';
        statusIndicator.classList.remove('active');
        binaryDisplay.innerHTML = '';
    }

    function showMessage(message) {
        messageElement.textContent = message;
    }

    // Event listeners
    startButton.addEventListener('click', startTransmission);
    stopButton.addEventListener('click', stopTransmission);
});
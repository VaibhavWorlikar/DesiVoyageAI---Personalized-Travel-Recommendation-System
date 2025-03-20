// Global variables for UI state
let isLoading = false;

function setLoading(loading) {
    isLoading = loading;
    const buttons = document.querySelectorAll('button');
    const loadingIndicator = document.getElementById('loadingIndicator');
    
    if (loading) {
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.classList.add('disabled');
        });
        if (loadingIndicator) loadingIndicator.style.display = 'block';
    } else {
        buttons.forEach(btn => {
            btn.disabled = false;
            btn.classList.remove('disabled');
        });
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }
}

function displayError(message) {
    const resultsList = document.getElementById("results");
    resultsList.innerHTML = `<li class="error">${message}</li>`;
}

function displayResults(data) {
    const resultsList = document.getElementById("results");
    resultsList.innerHTML = "";
    
    if (data.length === 0) {
        resultsList.innerHTML = "<li>No destinations found matching your criteria.</li>";
        return;
    }
    
    data.forEach(dest => {
        let listItem = document.createElement("li");
        let scoreType = dest.hasOwnProperty('similarity_score') ? 'Similarity' : 'Match';
        let score = dest.hasOwnProperty('similarity_score') ? dest.similarity_score : dest.match_score;
        
        listItem.innerHTML = `
            <span class="destination-name">${dest.name}</span>
            <span class="score">${scoreType} Score: ${score}%</span>
            <button onclick="getDestinationDetails(${dest.destination_id})" class="details-btn">Details</button>
        `;
        resultsList.appendChild(listItem);
    });
}

async function getSimilarDestinations() {
    if (isLoading) return;
    
    const destination = document.getElementById("destinationSelect").value;
    if (!destination) {
        displayError("Please select a destination");
        return;
    }
    
    setLoading(true);
    
    try {
        const response = await fetch("/similar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                destination: destination,
                top_n: document.getElementById("numResults").value || 5
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to get similar destinations");
        }
        
        const data = await response.json();
        displayResults(data);
        
    } catch (error) {
        displayError(`Error: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

async function getRecommendations() {
    if (isLoading) return;
    
    setLoading(true);
    
    try {
        const preferences = {
            culture: document.getElementById("culture").value,
            nature: document.getElementById("nature").value,
            adventure: document.getElementById("adventure").value,
            relaxation: document.getElementById("relaxation").value,
            spiritual: document.getElementById("spiritual").value,
            food: document.getElementById("food").value,
            top_n: document.getElementById("numResults").value || II
        };

        const response = await fetch("/recommend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(preferences)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to get recommendations");
        }
        
        const data = await response.json();
        displayResults(data);
        
    } catch (error) {
        displayError(`Error: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

async function getDestinationDetails(destId) {
    if (isLoading) return;
    
    setLoading(true);
    
    try {
        const response = await fetch(`/destination/${destId}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to get destination details");
        }
        
        const data = await response.json();
        
        // Display a modal with destination details
        const detailsModal = document.getElementById("detailsModal");
        const detailsContent = document.getElementById("detailsContent");
        
        detailsContent.innerHTML = `
            <h3>${data.name}</h3>
            <div class="scores-container">
                <div class="score-item">
                    <span class="score-label">Culture:</span>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${data.culture_score * 10}%"></div>
                    </div>
                    <span class="score-value">${data.culture_score}/10</span>
                </div>
                <div class="score-item">
                    <span class="score-label">Nature:</span>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${data.nature_score * 10}%"></div>
                    </div>
                    <span class="score-value">${data.nature_score}/10</span>
                </div>
                <div class="score-item">
                    <span class="score-label">Adventure:</span>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${data.adventure_score * 10}%"></div>
                    </div>
                    <span class="score-value">${data.adventure_score}/10</span>
                </div>
                <div class="score-item">
                    <span class="score-label">Relaxation:</span>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${data.relaxation_score * 10}%"></div>
                    </div>
                    <span class="score-value">${data.relaxation_score}/10</span>
                </div>
                <div class="score-item">
                    <span class="score-label">Spiritual:</span>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${data.spiritual_score * 10}%"></div>
                    </div>
                    <span class="score-value">${data.spiritual_score}/10</span>
                </div>
                <div class="score-item">
                    <span class="score-label">Food:</span>
                    <div class="score-bar">
                        <div class="score-fill" style="width: ${data.food_score * 10}%"></div>
                    </div>
                    <span class="score-value">${data.food_score}/10</span>
                </div>
            </div>
        `;
        
        detailsModal.style.display = "block";
    } catch (error) {
        displayError(`Error: ${error.message}`);
    } finally {
        setLoading(false);
    }
}

function closeModal() {
    const detailsModal = document.getElementById("detailsModal");
    detailsModal.style.display = "none";
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const detailsModal = document.getElementById("detailsModal");
    if (event.target === detailsModal) {
        detailsModal.style.display = "none";
    }
}

// Initialize range sliders with value displays
document.addEventListener('DOMContentLoaded', function() {
    const sliders = document.querySelectorAll('input[type="range"]');
    
    sliders.forEach(slider => {
        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'slider-value';
        valueDisplay.textContent = slider.value;
        slider.parentNode.appendChild(valueDisplay);
        
        slider.addEventListener('input', function() {
            valueDisplay.textContent = this.value;
        });
    });
});
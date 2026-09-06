import "../styles/loading.css";

function Loading({ fullScreen = true }) {
    return (
        <div className={fullScreen ? "loading-overlay" : "loading-container"}>
            <div className="loading-spinner"></div>
        </div>
    );
}

export default Loading;

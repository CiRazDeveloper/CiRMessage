import { getUsername, getDisplayName } from "../storage.js";

function Home() {
    const username = getUsername();
    const displayName = getDisplayName();

    return (
        <div>
            <h1>Welcome, {displayName}!</h1>
            <p>Username: {username}</p>
        </div>
    );
}

export default Home;

import "../styles/general.css";
import "../styles/pages/home.css";

import ShowGroup from "./../components/group/ShowGroup.jsx"

import cirazImg from "./../assets/CiRaz-Image.PNG";


function Home() {
    return (
        <div className="home_main">
            <div className="home_group">
                <ShowGroup 
                    img={cirazImg}
                />

                <ShowGroup 
                    img={cirazImg}
                />

                <ShowGroup 
                    img={cirazImg}
                />

                <ShowGroup 
                    img={cirazImg}
                />

                <ShowGroup 
                    img={cirazImg}
                />

                <ShowGroup 
                    img={cirazImg}
                />

                <ShowGroup 
                    img={cirazImg}
                />

                <ShowGroup 
                    img={cirazImg}
                />

                <ShowGroup 
                    img={cirazImg}
                />

                <ShowGroup 
                    img={cirazImg}
                />

            </div>

            <div className="home_sidebar">
            </div>

            <div className="home_view">
            </div>
        </div>
    );
}

export default Home;

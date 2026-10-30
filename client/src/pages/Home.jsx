import "../styles/pages/home.css";

import Scrollbar from './../components/view/ScrollBar.jsx';
import ShowGroup from "./../components/group/ShowGroup.jsx"

import cirazImg from "./../assets/CiRaz-Image.PNG";


function Home() {
    return (
        <div className="home_main">
            <Scrollbar className="home_group_scroll">
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
            </Scrollbar>

            <div className="home_sidebar">
            </div>

            <div className="home_view">
            </div>
        </div>
    );
}

export default Home;

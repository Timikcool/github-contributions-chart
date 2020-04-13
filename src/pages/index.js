import React, { useRef, useState, useEffect } from "react";
import { download, uploadToTwitter, fetchData } from "../utils/export";
import ThemeSelector from "../components/themes";

const App = () => {
  const inputRef = useRef();
  const canvasRef = useRef();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState("standard");
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!data) {
      return;
    }
    draw();
  }, [data, theme]);

  const handleSubmit = (e) => {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setData(null);

    fetchData(username)
      .then((data) => {
        setLoading(false);

        if (data.years.length === 0) {
          setError("Could not find your profile");
        } else {
          setData(data);
          inputRef.current.blur();
        }
      })
      .catch((err) => {
        console.log(err);
        setLoading(false);
        setError("I could not check your profile successfully...");
      });
  };

  const handleChangeTheme = (themeName) => {
    setTheme(themeName);
  };

  const onDownload = (e) => {
    e.preventDefault();
    download(canvasRef.current);
  };

  const onShareTwitter = (e) => {
    e.preventDefault();
    uploadToTwitter(canvasRef.current);
  };

  const draw = async () => {
    if (!canvasRef.current || !data) {
      setError("Something went wrong... Check back later.");
      return;
    }

    const { drawContributions } = await import("github-contributions-canvas");

    drawContributions(canvasRef.current, {
      data,
      username: username,
      headerText: `@${username} on GitLab`,
      themeName: theme,
      footerText: "Made by @sallar & friends - github-contributions.now.sh",
    });
  };

  const _renderGithubButton = () => {
    return (
      <div className="App-github-button">
        <a
          className="github-button"
          href="https://github.com/sallar/github-contributions-chart"
          data-size="large"
          data-show-count="true"
          aria-label="Star sallar/github-contribution-chart on GitHub"
        >
          Star
        </a>
      </div>
    );
  };

  const _renderLoading = () => {
    return (
      <div className="App-centered">
        <div className="App-loading">
          <img src={"/loading.gif"} alt="Loading..." width={200} />
          <p>Please wait, I’m visiting your profile...</p>
        </div>
      </div>
    );
  };

  const _renderGraphs = () => {
    return (
      <div
        className="App-result"
        style={{ display: data !== null && !loading ? "block" : "none" }}
      >
        <p>Your chart is ready!</p>
        <div className="App-buttons">
          <button
            className="App-download-button"
            onClick={onDownload}
            type="button"
          >
            Download the Image
          </button>
          or
          <button
            className="App-twitter-button"
            onClick={onShareTwitter}
            type="button"
          >
            Share on Twitter
          </button>
        </div>

        <canvas ref={canvasRef} />
      </div>
    );
  };

  const _renderForm = () => {
    return (
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          placeholder="Your GitLab Username"
          onChange={(e) => setUsername(e.target.value)}
          value={username}
          id="username"
          autoFocus
        />
        <button type="submit" disabled={username.length <= 0}>
          <span role="img" aria-label="Stars">
            ✨
          </span>{" "}
          Generate!
        </button>
      </form>
    );
  };

  const _renderError = () => {
    return (
      <div className="App-error App-centered">
        <p>{error}</p>
      </div>
    );
  };

  return (
    <div className="App">
      <header className="App-header">
        <h5 className="Fork-label">
          {`This project is a fork of `}
          <a href="github-contributions.now.sh">@sallar's github project</a>
        </h5>

        <div className="App-logo">
          <img src="/GitLab_Logo.png" width={150} alt="GitLabLogo" />
          <h1>GitLab Contributions Chart Generator</h1>
          <h4>All your public contributions in one image!</h4>
        </div>
        {_renderForm()}
        <ThemeSelector
          currentTheme={theme}
          onChangeTheme={(themeName) => setTheme(themeName)}
        />
        <footer>{_renderGithubButton()}</footer>
      </header>
      <section className="App-content">
        {loading && _renderLoading()}
        {error !== null && _renderError()}
        {_renderGraphs()}
      </section>
    </div>
  );
};

export default App;

import "normalize.css/normalize.css";
import "../styles/index.css";
import "../styles/App.css";

import Head from "next/head";

export default ({ Component, pageProps }) => (
  <>
    <Head>
      <title>GitLab Contributions Chart Generator</title>
      <meta
        name="description"
        content="See all of your GitLab public contributions in one image!"
      />
    </Head>
    <Component {...pageProps} />
  </>
);

import Head from "next/head";
import "../styles/tokens.css";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Mes Recettes</title>
        <meta
          name="description"
          content="Carnet de recettes personnel — importez vos recettes préférées depuis le web."
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

import Feed from "@components/Feed"

const Home = () => {
  return (
    <section className="w-full flex-center
    flex-col">
        <h1 className="head_text textcenter">
            Discover & Share
            <br className="max-md:hidden"></br>
            <span className="orange_gradient text-center"> 
            AI powered </span>
        </h1>
        <p className="desc text-center">
            aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
            aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
        </p>

        <Feed />
    </section>
  )
}

export default Home
export default function HeroSection() {
  return (
    <div className="relative h-screen bg-cover bg-center bg-no-repeat" 
         style={{ backgroundImage: "url('./attached_assets/LandingPageBackground.jpg')" }}>
      {/* Semi-transparent dark overlay */}
      <div className="absolute inset-0 bg-black opacity-50"></div>
      {/* Centered content above the overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full text-white">
        <h1 className="text-5xl font-bold mb-4">Your Headline Here</h1>
        <p className="mb-6">Some descriptive subtitle or tagline.</p>
        <button className="px-6 py-3 bg-blue-500 hover:bg-blsue-700 rounded">Get Started</button>
      </div>
    </div>
  );
}
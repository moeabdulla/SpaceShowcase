import axios from "axios";

const TTSTest = () => {
  const sendRequest = async () => {
    const defaultText = "Hello World";

    try {
      // Send a POST request to our TTS route
      const response = await axios.post(
        "/api/generateTTS",
        { text: defaultText },
        {
          // We expect binary audio (WAV) back
          responseType: "arraybuffer",
        }
      );

      // Convert binary data to a Blob, then create a URL
      const audioBlob = new Blob([response.data], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      // Play the audio
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error("Error fetching TTS data:", error);
      alert(
        `Error: ${
          error.response?.data?.error ||
          "Failed to fetch TTS data. Check console logs."
        }`
      );
    }
  };

  return (
    <div className="tts-test">
      <h1>TTS Test</h1>
      <p>Click below to test the TTS API with &quot;Hello World&quot;.</p>
      <button onClick={sendRequest}>Test TTS</button>
    </div>
  );
};

export default TTSTest;
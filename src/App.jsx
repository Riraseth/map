import './App.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';

const position = [52.237049, 21.017532];

var myAPIKey = '247a801b7ef64eeda4a5ddc97b7a36b0';

var url = `https://api.geoapify.com/v1/batch/geocode/search?apiKey=${myAPIKey}`;
function App() {
  const [results, setResults] = useState();
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    async function fetchData() {
      const data = await fetch(
        'https://wavy-media-proxy.wavyapps.com/investors-notebook/inst5/?action=get_entries'
      ).then((response) => response.json());
      const notes = data.map((item) => item.Notes);
      const addresses = data.map((item) => item.Address);
      const geocodingResults = await fetch(url, {
        method: 'post',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addresses.slice(0, 70)),
      })
        .then(getBodyAndStatus)
        .then((result) => {
          if (result.status !== 202) {
            return Promise.reject(result);
          } else {
            console.log('Job ID: ' + result.body.id);
            console.log('Job URL: ' + result.body.url);
            return getAsyncResult(
              `${url}&id=${result.body.id}`,
              1000,
              100
            ).then((queryResult) => {
              let markerData = [];
              for (let i = 0; i < queryResult.length; i++) {
                markerData[i] = {
                  coordinates: [queryResult[i].lat, queryResult[i].lon],
                  note: notes[i],
                };
              }
              setResults(markerData);
              setIsLoading(false);
              return markerData;
            });
          }
        })
        .catch((err) => console.log(err));

      function getBodyAndStatus(response) {
        return response.json().then((responceBody) => {
          return {
            status: response.status,
            body: responceBody,
          };
        });
      }

      function getAsyncResult(url, timeout, maxAttempt) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            repeatUntilSuccess(resolve, reject, 0);
          }, timeout);
        });

        function repeatUntilSuccess(resolve, reject, attempt) {
          console.log('Attempt: ' + attempt);
          fetch(url)
            .then(getBodyAndStatus)
            .then((result) => {
              if (result.status === 200) {
                resolve(result.body);
              } else if (attempt >= maxAttempt) {
                reject('Max amount of attempt achived');
              } else if (result.status === 202) {
                // Check again after timeout
                setTimeout(() => {
                  repeatUntilSuccess(resolve, reject, attempt + 1);
                }, timeout);
              } else {
                // Something went wrong
                reject(result.body);
              }
            })
            .catch((err) => reject(err));
        }
      }
    }
    fetchData();
  }, []);

  if (isLoading) return <div>Loading</div>;

  if (results) {
    return (
      <>
        <MapContainer center={position} zoom={7} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {results.map(
            (result) =>
              result.coordinates && (
                <Marker
                  position={result.coordinates ? result.coordinates : position}
                >
                  <Popup>{result.note}</Popup>
                </Marker>
              )
          )}
        </MapContainer>
      </>
    );
  }
}

export default App;

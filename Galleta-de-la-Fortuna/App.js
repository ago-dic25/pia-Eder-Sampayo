import { Accelerometer } from 'expo-sensors';
import { useState, useEffect, useRef } from 'react';
import { View, Image, Text, Button, StyleSheet } from 'react-native';
//import { Animated, Easing } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAudioPlayer } from 'expo-audio';
import { getFraseAleatoria } from './Frase';
import Animated, { useSharedValue,
        withTiming,
        useAnimatedStyle,
        withRepeat,
        withSequence,
        Easing } from 'react-native-reanimated';

const cookieCrackSound = require('./assets/Galleta_rompiendo_1.mp3');

// Paleta de colores de la aplicacion basada en el estado de la galleta
const idleColor = '#81dcecff';
const lightShakeColor = '#DEA47E';
const strongShakeColor = '#CD4631';

export default function App() {
  const [playing, setPlaying] = useState(false);

  //Configuraciones del acelerómetro
  Accelerometer.setUpdateInterval(200);
  const [motionData, setMotionData] = useState(null);

  // Configuraciones de la galleta de la fortuna
  let [hp, setHp] = useState(12);
  const [boxColor, setBoxColor] = useState('skyblue');
  const audioPlayer = useAudioPlayer(cookieCrackSound);

  // state to hold fetched phrase when cookie breaks
  const [frase, setFrase] = useState(null);
  const [loadingFrase, setLoadingFrase] = useState(false);

  // configuracion para las animaciones
  const [frame, setFrame] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [inNormalRange, setInNormalRange] = useState(true);

  // referencia para la animación de sacudida
  const isShakingRef = useRef(false);
  const shakeAnim = useSharedValue(0);

  //configuración de animación de flotar
  const floatAnim = useSharedValue(0);

  
  const frames = [
    require('./assets/Galleta_cerrada-1.png'),
    require('./assets/Galleta_cerrada-2.png'),
    require('./assets/Galleta_abierta-1.png'),
    require('./assets/Galleta_abierta-2.png'),
  ];

  // Animación de flotar (vertical)
  useEffect(() => {
    floatAnim.value = withRepeat(
      withTiming(-20, {
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, [floatAnim]);

  // Animación de sacudir (horizontal)
  const startShake = () => {
    shakeAnim.value = withRepeat(
      withSequence(
        withTiming(30, { duration: 50, easing: Easing.linear }),
        withTiming(-30, { duration: 100, easing: Easing.linear }),
        withTiming(0, { duration: 50, easing: Easing.linear })
      ),
      3, // numero de sacuridas
      false
    );
  };

  const stopShake = () => {
    shakeAnim.value = withTiming(0, { duration: 100 });
    isShakingRef.current = false;
  }

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: shakeAnim.value },
        { translateY: floatAnim.value },
      ],
    };
  });

  const brokenCookieStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: floatAnim.value },
      ],
      opacity: withTiming(hp <= 0 ? 1 : 0, { duration: 500 }),
    };
  });

  const reproducirSonido = () => {
    //no reproducir si el audioPlayer no está listo o está reproduciendo
    if (!audioPlayer || audioPlayer.paused === false) {
      return;
    }

    // velocidad de reproduccion aleatoria entre 0.6 y 1.4
    const ratio = Math.random() * (1.4 - 0.6) + 0.6; 

    audioPlayer.shouldCorrectPitch = false;
    audioPlayer.setPlaybackRate(ratio);

    audioPlayer.seekTo(0);
    audioPlayer.play();

    
  }

  const requestPermissionAndStartListening = async () => {
    if (motionData) {
      console.log("Ya está escuchando el acelerómetro");
      return; // Regresar si ya está escuchando
    }

    // Obtener permisos
    const { status } = await Accelerometer.getPermissionsAsync();
    console.log('Permission status:', status);

    // Solicitar permisos si no están concedidos
    if (status !== 'granted') {
      const { status: newStatus } = await Accelerometer.requestPermissionsAsync();
      console.log('New permission status:', newStatus);
    }

    // Verificar disponibilidad del sensor);
    const available = await Accelerometer.isAvailableAsync();
    console.log('Accelerometer available:', available);
    
    // Iniciar escucha de datos del sensor
    /*
      Acélerómetro: detecta movimientos en los ejes.
      Al detectar un movimiento, baja la vida de la galleta.
      La vida baja más si el movimiento es más fuerte.
    */
    if (available) {
      Accelerometer.addListener((data) => {
        const x = data.x;
        const y = data.y - 1; // Ajustar para gravedad
        const z = data.z;

        let damage = 0;


        const ignorarGravedad =
          (y > 1 || y < -1) && (x < 0.2 && x > -0.2);

        const isStrongShake =
          y >= 1.8 || y <= -1.8 || x >= 1.8 || x <= -1.8;

        const isMediumShake =
          y >= 1.3 || y <= -1.3 || x >= 1.3 || x <= -1.3;

        const isShakingNow = isStrongShake || isMediumShake;
        

        // si se agita
        if (isShakingNow && !ignorarGravedad) {
          if (!isShakingRef.current) {
            isShakingRef.current = true;
            setIsShaking(true);
            setInNormalRange(false);
            startShake(); // animación confiable
          }

          // cambio color
          if (isStrongShake) {
            setBoxColor(strongShakeColor);
            reproducirSonido();
            damage = 3;
          } 

          else if (isMediumShake) {
            setBoxColor(lightShakeColor);
            reproducirSonido();
            damage = 1;
          }

          // actualizar HP y frame
          setHp((prevHP) => {
            const newHP = prevHP - damage;

            // cambiar entre el primer y segundo frame mientras se agita
            if (newHP > 8) {
              setFrame((prevFrame) => (prevFrame === 0 ? 1 : 0)); // galleta cerrada
            }else if (newHP > 0) {
              setFrame(2); // galleta casi abierta
            }else {
              setFrame(3); // galleta abierta
            }
            return newHP;
          });

          setMotionData(data);
          return;
        }

        if (!isShakingNow && isShakingRef.current) {
          isShakingRef.current = false;
          setIsShaking(false);
          stopShake(); // detiene la animación
        }

        // volver color normal
        setBoxColor(idleColor);

        setMotionData(data);
      });
    }
  };

  //Iniciar la peticion de permisos al cargar la app
  if (!motionData)
  { 
    requestPermissionAndStartListening();
  }
  

  // fetch a phrase when HP drops to 0 (or below)
  useEffect(() => {
    let mounted = true;
    if (hp <= 0) {
      setLoadingFrase(true);
      (async () => {
        const f = await getFraseAleatoria();
        if (mounted) {
          setFrase(f);
          setLoadingFrase(false);
        }
      })();
    } else {
      // reset phrase when cookie is alive again
      setFrase(null);
      setLoadingFrase(false);
    }
    return () => { mounted = false; };
  }, [hp]);

  if (hp <= 0) {
    return (
      <View style={[styles.container, {backgroundColor: 'black'}]}>
        <Text style={{color: 'white', fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 12}}>
          ¡La galleta de la fortuna se ha roto!
        </Text>
        <Animated.View
          style={brokenCookieStyle}
        >
          <Image
            source={frames[3]}
            style={{ width: 200, height: 200 }}
          />
        </Animated.View>
        {loadingFrase && <Text style={{color: 'white'}}>Cargando frase...</Text>}
        {frase && (
          <>
            <Text style={{color: 'white', fontSize: 18, textAlign: 'center', marginTop: 10}}>
              "{frase.frase}"
            </Text>
            <Text style={{color: 'white', fontSize: 14, textAlign: 'center', marginTop: 6}}>
              — {frase.autor}
            </Text>
          </>
        )}
        <Button 
          title="Reiniciar Galleta"
          onPress={() => {
            setHp(30);
            setBoxColor(idleColor);
            setFrame(0);
          }}
        />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: boxColor}]}>
      <Animated.View
        style={
          [animatedStyle]
        }
      >
        <Image
          source={frames[frame]}
          style={{ width: 400, height: 400 }}
        />
      </Animated.View>
      <View style={[styles.caja, { backgroundColor: boxColor }]}>
        <Text style={{ fontSize: 24, fontWeight: 'bold' }}> vida: {hp} </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  caja: {
    width: 200,
    height: 200,
    textAlign: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 20,
  }
});

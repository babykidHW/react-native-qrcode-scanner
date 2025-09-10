'use strict';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';

import {
  StyleSheet,
  Dimensions,
  Vibration,
  Animated,
  Easing,
  View,
  Text,
  Platform,
  TouchableWithoutFeedback,
  PermissionsAndroid,
} from 'react-native';

import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera';

const QRCodeScanner = forwardRef((props, ref) => {
  const {
    onRead,
    vibrate = true,
    reactivate: shouldReactivate = false,
    reactivateTimeout = 0,
    cameraTimeout = 0,
    fadeIn = true,
    showMarker = false,
    cameraType = 'back',
    customMarker,
    containerStyle,
    cameraStyle,
    cameraContainerStyle,
    markerStyle,
    topViewStyle,
    bottomViewStyle,
    topContent,
    bottomContent,
    notAuthorizedView = (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontSize: 16,
          }}
        >
          Camera not authorized
        </Text>
      </View>
    ),
    pendingAuthorizationView = (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontSize: 16,
          }}
        >
          ...
        </Text>
      </View>
    ),
    permissionDialogTitle = 'Info',
    permissionDialogMessage = 'Need camera permission',
    buttonPositive = 'OK',
    checkAndroid6Permissions = false,
    torch = 'off',
    cameraProps = {},
    cameraTimeoutView = (
      <View
        style={{
          flex: 0,
          alignItems: 'center',
          justifyContent: 'center',
          height: Dimensions.get('window').height,
          width: Dimensions.get('window').width,
          backgroundColor: 'black',
        }}
      >
        <Text style={{ color: 'white' }}>Tap to activate camera</Text>
      </View>
    ),
  } = props;

  const [isCameraActivated, setIsCameraActivated] = useState(true);
  const [fadeInOpacity] = useState(() => new Animated.Value(0));
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthorizationChecked, setIsAuthorizationChecked] = useState(false);

  const device = useCameraDevice(cameraType);

  const isScanning = useRef(false);
  const scannerTimeoutRef = useRef(null);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: codes => {
      if (codes.length > 0 && !isScanning.current) {
        if (vibrate) {
          Vibration.vibrate();
        }
        isScanning.current = true;
        onRead(codes[0]);
        if (shouldReactivate) {
          scannerTimeoutRef.current = setTimeout(
            () => (isScanning.current = false),
            reactivateTimeout
          );
        }
      }
    },
  });

  const cameraTimeoutRef = useRef(null);

  useImperativeHandle(
    ref,
    () => ({
      reactivate: () => {
        isScanning.current = false;
      },
    }),
    [isScanning]
  );

  const setCamera = useCallback(
    value => {
      setIsCameraActivated(value);
      isScanning.current = false;
      fadeInOpacity.setValue(0);

      if (value && fadeIn) {
        Animated.sequence([
          Animated.delay(10),
          Animated.timing(fadeInOpacity, {
            toValue: 1,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
    [fadeIn, fadeInOpacity]
  );

  useEffect(
    () => {
      const checkPermissions = async () => {
        if (Platform.OS === 'ios') {
          const cameraStatus = await request(PERMISSIONS.IOS.CAMERA);
          setIsAuthorized(cameraStatus === RESULTS.GRANTED);
          setIsAuthorizationChecked(true);
        } else if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: permissionDialogTitle,
              message: permissionDialogMessage,
              buttonPositive: buttonPositive,
            }
          );
          const isAuthorized = granted === PermissionsAndroid.RESULTS.GRANTED;
          setIsAuthorized(isAuthorized);
          setIsAuthorizationChecked(true);
        } else {
          setIsAuthorized(true);
          setIsAuthorizationChecked(true);
        }
      };

      checkPermissions();

      if (fadeIn) {
        Animated.sequence([
          Animated.delay(1000),
          Animated.timing(fadeInOpacity, {
            toValue: 1,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }

      return () => {
        if (scannerTimeoutRef.current !== null) {
          clearTimeout(scannerTimeoutRef.current);
        }
        if (cameraTimeoutRef.current !== null) {
          clearTimeout(cameraTimeoutRef.current);
        }
        cameraTimeoutRef.current = null;
        scannerTimeoutRef.current = null;
      };
    },
    [
      fadeIn,
      fadeInOpacity,
      checkAndroid6Permissions,
      permissionDialogTitle,
      permissionDialogMessage,
      buttonPositive,
    ]
  );

  useEffect(
    () => {
      if (cameraTimeout > 0 && isAuthorized && isCameraActivated) {
        cameraTimeoutRef.current && clearTimeout(cameraTimeoutRef.current);
        cameraTimeoutRef.current = setTimeout(
          () => setCamera(false),
          cameraTimeout
        );
      }
    },
    [cameraTimeout, isAuthorized, isCameraActivated, setCamera]
  );

  const renderTopContent = () => {
    if (topContent) {
      return topContent;
    }
    return null;
  };

  const renderBottomContent = () => {
    if (bottomContent) {
      return bottomContent;
    }
    return null;
  };

  const renderCameraMarker = () => {
    if (showMarker) {
      if (customMarker) {
        return customMarker;
      } else {
        return (
          <View style={styles.rectangleContainer}>
            <View
              style={[styles.rectangle, markerStyle ? markerStyle : null]}
            />
          </View>
        );
      }
    }
    return null;
  };

  const renderCameraComponent = () => {
    return (
      <>
        <Camera
          style={[styles.camera, cameraStyle]}
          codeScanner={codeScanner}
          device={device}
          torch={torch}
          {...cameraProps}
        />
        {renderCameraMarker()}
      </>
    );
  };

  const renderCamera = () => {
    if (!isCameraActivated) {
      return (
        <TouchableWithoutFeedback onPress={() => setCamera(true)}>
          {cameraTimeoutView}
        </TouchableWithoutFeedback>
      );
    }

    if (isAuthorized) {
      if (fadeIn) {
        return (
          <Animated.View
            style={{
              opacity: fadeInOpacity,
              backgroundColor: 'transparent',
              height:
                (cameraStyle && cameraStyle.height) || styles.camera.height,
            }}
          >
            {renderCameraComponent()}
          </Animated.View>
        );
      }
      return renderCameraComponent();
    } else if (!isAuthorizationChecked) {
      return pendingAuthorizationView;
    } else {
      return notAuthorizedView;
    }
  };

  return (
    <View style={[styles.mainContainer, containerStyle]}>
      <View style={[styles.infoView, topViewStyle]}>{renderTopContent()}</View>
      <View style={cameraContainerStyle}>{device ? renderCamera() : null}</View>
      <View style={[styles.infoView, bottomViewStyle]}>
        {renderBottomContent()}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
  },
  infoView: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    width: Dimensions.get('window').width,
  },

  camera: {
    flex: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    height: Dimensions.get('window').width,
    width: Dimensions.get('window').width,
  },

  rectangleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    ...StyleSheet.absoluteFillObject,
  },

  rectangle: {
    height: 250,
    width: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    backgroundColor: 'transparent',
  },
});

export default QRCodeScanner;

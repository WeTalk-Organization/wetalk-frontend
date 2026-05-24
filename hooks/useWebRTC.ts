import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { CustomTrack } from '@/types/webRTC';
import { User } from '@/types/auth';

type ExistingProducer = { producerId: string; socketId: string; userId: string };

export function useWebRTC(socket: Socket | null, roomId: string, user?: User) {
    const userId = user?.id;
    const deviceRef = useRef<mediasoupClient.Device | null>(null);
    const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
    const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, {
        stream: MediaStream;
        socketId: string;
        userId?: string;
    }>>(new Map());

    const initDevice = useCallback(async () => {
        if (!socket || !roomId) return;

        try {
            console.log('🔄 Đang hỏi cấu hình (RtpCapabilities) từ Server...');

            const routerRtpCapabilities = await new Promise((resolve, reject) => {
                socket.emit('getRouterRtpCapabilities', { roomId }, (response: { error?: string } | mediasoupClient.types.RtpCapabilities) => {
                    if ('error' in response && response.error) reject(response.error);
                    else resolve(response);
                })
            })

            const device = new mediasoupClient.Device();
            await device.load({ routerRtpCapabilities: routerRtpCapabilities as mediasoupClient.types.RtpCapabilities });
            deviceRef.current = device;
            console.log('✅ Device tải xong! Cấu hình chuẩn:', device.rtpCapabilities);
        } catch (error) {
            console.error('❌ Lỗi khởi tạo Device Mediasoup:', error);
            if (error instanceof Error && error.name === 'UnsupportedError') {
                alert('Trình duyệt của bạn không hỗ trợ định dạng video của phòng này!');
            }
        }
    }, [socket, roomId]);

    const initTransports = useCallback(async () => {
        if (!deviceRef.current || !socket || !roomId) return;
        const device = deviceRef.current;

        console.log('🚧 Đang xin Máy chủ cấp phép mở 2 ống WebRTC...');

        try {
            const sendTransportData = await new Promise<mediasoupClient.types.TransportOptions>((resolve, reject) => {
                socket.emit('createWebRtcTransport', { roomId }, (response: mediasoupClient.types.TransportOptions & { error?: string }) => {
                    if (response.error) reject(response.error);
                    else resolve(response);
                });
            });
            const sendTransport = device.createSendTransport(sendTransportData);
            sendTransportRef.current = sendTransport;

            sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await new Promise((resolve, reject) => {
                        socket.emit('connectTransport', { transportId: sendTransport.id, dtlsParameters }, (res: { error?: string }) => {
                            if (res.error) reject(res.error); else resolve(res);
                        });
                    });
                    callback();
                } catch (error) { errback(error as Error); }
            })

            //khi thực sự bật camera
            sendTransport.on('produce', async (Parameters, callback, errback) => {
                try {
                    const { kind, rtpParameters, appData } = Parameters;
                    const response = await new Promise<{ id: string }>((resolve, reject) => {
                        socket.emit('produce', {
                            transportId: sendTransport.id,
                            kind,
                            rtpParameters,
                            appData: { ...appData, roomId, userId }
                        }, (res: { error?: string, id: string }) => {
                            if (res.error) reject(res.error); else resolve(res);
                        })
                    })
                    callback({ id: response.id });
                }

                catch (error) {
                    errback(error as Error);
                }
            }
            );

            // 2. TẠO ỐNG NHẬN (RECV)
            const recvTransportData = await new Promise<mediasoupClient.types.TransportOptions>((resolve, reject) => {
                socket.emit('createWebRtcTransport', { roomId }, (res: mediasoupClient.types.TransportOptions & { error?: string }) => {
                    if (res.error) reject(res.error); else resolve(res);
                });
            });

            const recvTransport = device.createRecvTransport(recvTransportData);
            recvTransportRef.current = recvTransport;

            recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
                try {
                    await new Promise((resolve, reject) => {
                        socket.emit('connectTransport', {
                            transportId: recvTransport.id,
                            dtlsParameters
                        }, (res: { error?: string }) => {
                            if (res.error) reject(res.error);
                            else resolve(res);
                        })
                    })
                    callback();
                } catch (error) { errback(error as Error); }
            });

            console.log('✅ Đã khai thông 2 ống Send và Recv thành công!');
        }
        catch (error) {
            console.error('❌ Lỗi tạo Transport:', error);
        }
    }, [socket, roomId, userId]);

    const produceMedia = useCallback(async (track: MediaStreamTrack): Promise<mediasoupClient.types.Producer> => {
        if (!sendTransportRef.current) {
            throw new Error('Ống dẫn Send chưa sẵn sàng!');
        }

        console.log(`🎥 Đang đóng gói dòng chảy [${track.kind}] để gửi lên Server...`);
        try {
            const producer = await sendTransportRef.current.produce({ track });

            producer.on('trackended', () => {
                console.log('Track kết thúc (bạn đã ngắt camera).');
            })
            producer.on('transportclose', () => {
                console.log('Ống dẫn Send bị đứt, Producer sập theo.');
            });
            return producer;

        } catch (error) {
            console.error('❌ Lỗi Produce:', error);
            throw error;
        }
    }, []);

    const consumeMedia = useCallback(async (producerId: string, socketId: string, userId?: string) => {
        if (!deviceRef.current || !recvTransportRef.current || !socket || !roomId) return;

        console.log(`📥 Đang xin Server kéo video của [${socketId}] (VideoID: ${producerId})...`);
        try {
            const { rtpCapabilities } = deviceRef.current;

            const consumeData = await new Promise<mediasoupClient.types.ConsumerOptions>((resolve, reject) => {
                socket.emit('consume', {
                    roomId, transportId: recvTransportRef.current!.id, producerId, rtpCapabilities
                }, (res: mediasoupClient.types.ConsumerOptions & { error?: string }) => {
                    if (res.error) reject(res.error);
                    else resolve(res);
                })
            });
            console.log('consumeData', consumeData)

            const consumer = await recvTransportRef.current.consume({
                id: consumeData.id,
                producerId: consumeData.producerId,
                kind: consumeData.kind,
                rtpParameters: consumeData.rtpParameters,
            });


            (consumer.track as CustomTrack).producerId = producerId;

            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                const existingStreamData = newMap.get(socketId);
                let combinedStream;
                if (existingStreamData) {
                    const existingTracks = existingStreamData.stream.getTracks();
                    combinedStream = new MediaStream([...existingTracks, consumer.track]);
                }
                else {
                    combinedStream = new MediaStream([consumer.track]);
                }
                newMap.set(socketId, { stream: combinedStream, socketId, userId: userId });
                return newMap;
            })

            consumer.track.onended = () => {
                console.log(`📴 Stream của [${socketId}] đã kết thúc.`);
                setRemoteStreams(prev => {
                    const newMap = new Map(prev);
                    const existing = newMap.get(socketId);
                    if (existing) {
                        existing.stream.removeTrack(consumer.track);
                        if (existing.stream.getTracks().length === 0) {
                            newMap.delete(socketId);
                        }
                    }
                    return newMap;
                });
            };

            await new Promise((resolve) => {
                socket.emit('resumeConsumer', { transportId: recvTransportRef.current!.id, consumerId: consumer.id }, resolve);
            });

        } catch (error) {
            console.error('❌ Lỗi Consume Stream:', error);
        }
    }, [socket, roomId]);


    useEffect(() => {
        if (!socket) return;

        socket.on('newProducer', ({ producerId, socketId, userId }) => {
            void consumeMedia(producerId, socketId, userId);
        });

        socket.on('producerClosed', ({ socketId, producerId }) => {
            console.log(`📴 Producer của [${socketId}] đã đóng.`);
            setRemoteStreams(prev => {
                const newMap = new Map(prev);
                const existing = newMap.get(socketId);
                if (existing) {
                    const remainingTracks = existing.stream.getTracks().filter(
                        (t: MediaStreamTrack) => (t as CustomTrack).producerId !== producerId
                    );
                    if (remainingTracks.length === 0) {
                        newMap.delete(socketId);
                    }
                    else {
                        newMap.set(socketId, {
                            ...existing,
                            stream: new MediaStream(remainingTracks)
                        });
                    }
                }
                return newMap;
            });
        });

        return () => {
            socket.off('newProducer');
            socket.off('producerClosed');
        };
    }, [socket, consumeMedia]);


    useEffect(() => {
        if (!socket || !user) return;

        initDevice()
            .then(() => initTransports())
            .then(() => {
                // ✅ emit join-room SAU KHI transport sẵn sàng
                socket.emit(
                    'join-room',
                    {
                        roomId,
                        user: {
                            id: user.id,
                            firstName: user.firstName,
                            lastName: user.lastName,
                            avatar: user.avatar,
                            bio: user.bio,
                        },
                    },
                    async (response: { joined: boolean; existingProducers: ExistingProducer[] }) => {
                        console.log('📋 existingProducers:', response.existingProducers);
                        for (const { producerId, socketId, userId } of response.existingProducers ?? []) {
                            await consumeMedia(producerId, socketId, userId);
                        }
                    },
                );
            })
            .catch((err) => console.error('❌ Lỗi khởi tạo WebRTC:', err));
    }, [socket, user, roomId, initDevice, initTransports, consumeMedia]);

    return {
        remoteStreams,
        produceMedia,
        consumeMedia
    };
}
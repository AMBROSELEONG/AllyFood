import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Platform, Pressable, TextInput, Dimensions, Image, FlatList, TouchableOpacity } from "react-native";
import Snackbar from 'react-native-snackbar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MainContainer from '../components/MainContainer';
import { css, datepickerCSS } from '../objects/commonCSS';
import RNFetchBlob from 'rn-fetch-blob';
import { BarData, pickingListData } from '../objects/objects';
import DateTimePicker from '@react-native-community/datetimepicker';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { LineChart } from 'react-native-chart-kit';
import { ImagesAssets } from '../objects/images';

const PickingListScreen = () => {
    const getDate = new Date;
    const [todayDate, setTodayDate] = useState<string | "">(getDate.toISOString().split('T')[0]+" 00:00:00");

    // DatePicker
    const [showPicker, setShowPicker] = useState(false);
    const [selectedIOSDate, setSelectedIOSDate] = useState(new Date());

    const [fetchedData, setFetchedData] = useState<pickingListData[]>([]); // Flatlist with Pie
    const [BarData, setBarData] = useState<BarData>({ labels: [], datasets: [{ data: [] }] });
    const [totalAmount, setTotalAmount] = useState<number>(0); // total
    
    const [dataProcess, setDataProcess] = useState(false);
    const [expandedItems, setExpandedItems] = useState([]);

    // IOS Date picker modal setup
    const [datePickerVisible, setDatePickerVisible] = useState(false);
    const hideIOSDatePicker = () => {
        setDatePickerVisible(false);
    };
    // END IOS Date Picker modal setup

    useEffect(()=> {
        (async()=> {
            setFetchedData([]);
            setBarData({ labels: [], datasets: [{ data: [] }] });
            if(await AsyncStorage.getItem('setDate')==null){
                setTodayDate(await AsyncStorage.getItem('setDate') ?? todayDate);
                fetchDataApi(todayDate);
            }else{
                setTodayDate(await AsyncStorage.getItem('setDate') ?? todayDate);
                fetchDataApi(await AsyncStorage.getItem('setDate'));
            }
        })();
    }, []);

    const fetchDataApi = async(todayDate: any) => {
        setDataProcess(true);
        
        var getIPaddress=await AsyncStorage.getItem('IPaddress');

        await RNFetchBlob.config({
            trusty: true,
        }).fetch('GET', "https://"+getIPaddress+"/App/GetPickingList?todayDate="+todayDate,{
            "Content-Type": "application/json",
        }).then(async (response) => {
            // console.log(response.json());
            if(await response.json().isSuccess==true){
                setFetchedData(response.json().customerData.map((item: { 
                    customerId: string; 
                    customerName: string; 
                    goodsIssueId: number;
                    refNo: string;
                    isDoneLoadingOnTruck: boolean;
                    isDonePicking: boolean;

                }) => ({
                    key: item.goodsIssueId,
                    customerID: item.customerId,
                    customerName: item.customerName,
                    refNo: item.refNo,
                    isDoneLoadingOnTruck: item.isDoneLoadingOnTruck,
                    isDonePicking: item.isDonePicking,

                    datasets: [],
                    // {
                    //     productCode: "",
                    //     productName: "",
                    //     toPickCartonQuantity: 0,
                    //     toPickPalletQuantity: 0,
                    //     locationStockBalances: [{
                    //         locationDescription: "",
                    //         cartonBalance: 0,
                    //         palletBalance: 0,
                    //     }]
                    // }
                })));
                
                const WeightArray=(response.json().barChart.map((item: { goodsIssueCount: any; }) => item.goodsIssueCount));
                const MaxWeight = Math.max.apply(Math, WeightArray);
                const MaxWeight_Rounded = Math.ceil(MaxWeight/5) * 5;

                const convertedData: BarData = {
                    labels: response.json().barChart.map((item: { days: any; }) => item.days),
                    datasets: [
                        {
                            data: response.json().barChart.map((item: { goodsIssueCount: any; }) => item.goodsIssueCount),
                        },
                        {
                            data: [MaxWeight_Rounded],
                            withDots: false,
                        },
                    ],
                };
                setBarData(convertedData);
                setTotalAmount(response.json().todayIssueAmount);
            }else{
                // console.log(response.json().message);
                Snackbar.show({
                    text: response.json().message,
                    duration: Snackbar.LENGTH_SHORT,
                });
            }
        }).catch(error => {
            // console.error(error.message);
        });
        setDataProcess(false);
    }

    const fetchDetailApi = async(goodsID: any) => {
        setFetchedData((prevData) =>
            prevData.map((item) =>
            item.key === goodsID ? { ...item, datasets: [] } : item
            )
        );

        var getIPaddress=await AsyncStorage.getItem('IPaddress');

        await RNFetchBlob.config({
            trusty: true,
        }).fetch('GET', "https://"+getIPaddress+"/App/GetPickingListDetail?goodsIssueId="+goodsID,{
            "Content-Type": "application/json",
        }).then(async (response) => {
            // console.log(response.json());
            if(await response.json().isSuccess==true){

                setFetchedData((prevData) =>
                    prevData.map((item) =>
                        item.key === goodsID ? { ...item, datasets: [...item.datasets, ...response.json().pickingListTable] } : item
                    )
                );
            }else{
                // console.log(response.json().message);
                Snackbar.show({
                    text: response.json().message,
                    duration: Snackbar.LENGTH_SHORT,
                });
            }
        }).catch(error => {
            console.error(error.message);
        });
    }

    const FlatListItem = ({ item }: { item: pickingListData }) => {
        return (
            <TouchableOpacity onPress={async () => {

                if (expandedItems.includes(item.key as never)) {
                    //reset
                    
                } else {
                    await fetchDetailApi(item.key);
                }
                toggleItem(item.key);
            }}>
                <View style={[css.listItem,{padding:5}]} key={parseInt(item.key)}>
                    <View style={[css.cardBody]}>
                        <View style={{alignItems:'flex-start',justifyContent:'center',}}>
                            <View style={{flexDirection:'row'}}>
                                <View style={{flexDirection:'column',width:"70%"}}>
                                    <View>
                                        <Text style={css.basicTextHeader} numberOfLines={2}>Customer: {item.customerName}</Text>
                                    </View>
                                    <View>
                                        <Text style={css.basicTextDiscription}>RefNo: {item.refNo}</Text>
                                    </View>
                                </View>
                                <View style={{flexDirection:'column',width:"30%"}}>
                                    <View style={{flexDirection:'row'}}>
                                        <Text style={[css.basicTextHeader,{verticalAlign:"middle"}]}>Status:</Text>
                                        {(item.isDonePicking==true && item.isDoneLoadingOnTruck==true) ? 
                                        (
                                            <Pressable
                                                style={[css.typeButton, { backgroundColor: "green",margin:2, }]}
                                                onPress={async () => []}
                                            ></Pressable>
                                        ) : (item.isDonePicking==true && item.isDoneLoadingOnTruck==false) ? (
                                            <Pressable
                                                style={[css.typeButton, { backgroundColor: "yellow",margin:2, }]}
                                                onPress={async () => []}
                                            ></Pressable>
                                        ) : (
                                            <Pressable
                                                style={[css.typeButton, { backgroundColor: "red",margin:2, }]}
                                                onPress={async () => []}
                                            ></Pressable>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>
                        {expandedItems.includes(item.key as never) && (
                            <View>
                                {item.datasets.map((balance, balanceIndex) => (
                                    <View key={balanceIndex}>
                                        <View style={{ flex: 1, alignSelf: 'stretch', flexDirection: 'row', borderWidth: 1, margin:5 }}>
                                            <View style={{ width: "30%", flex: 1, alignSelf: 'stretch', borderWidth: 1}}>
                                                <Text>{balance.productName}</Text>
                                            </View>
                                            <View style={{ width: "30%", flex: 1, alignSelf: 'stretch', borderWidth: 1}}>
                                                <Text>{balance.toPickCartonQuantity.toString()}</Text>
                                            </View>
                                            <View style={{ width: "30%", flex: 1, alignSelf: 'stretch', borderWidth: 1}}>
                                                <Text>{balance.toPickPalletQuantity.toString()}</Text>
                                            </View>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
                
            </TouchableOpacity>
        );
    };

    const toggleItem = (itemId: any) => {
        if (expandedItems.includes(itemId as never)) {
          setExpandedItems(expandedItems.filter((id) => id !== itemId));
        } else {
          setExpandedItems([...expandedItems, itemId as never]);
        }
    };

    // Date Picker
    const onChangeDate = async ({type}: any, selectedDate: any) => {
        setShowPicker(false);
        if(type=="set"){
            const currentDate=selectedDate;
            setSelectedIOSDate(currentDate);
            if(Platform.OS==="android"){
                setTodayDate(currentDate.toISOString().split('T')[0]);
                await AsyncStorage.setItem('setDate', currentDate.toISOString().split('T')[0]+" 00:00:00");
                setShowPicker(false);
                await fetchDataApi(currentDate.toISOString().split('T')[0]);
            }
        }
    } 

    const confirmIOSDate = async(date:any) => {
        const currentDate=date;
        setTodayDate(currentDate.toISOString().split('T')[0]);
        await AsyncStorage.setItem('setDate', currentDate.toISOString().split('T')[0]+" 00:00:00");
        setDatePickerVisible(false);
        await fetchDataApi(currentDate.toISOString().split('T')[0]);
    }

    const tonggleDatePicker = () => {
        if (Platform.OS === 'android') {
            setShowPicker(!showPicker);
        }
        else if (Platform.OS === 'ios') {
            setDatePickerVisible(true);
        }
    }
    // End Date Picker

    return (
        <MainContainer>
            {/* Set Date */}
            <View style={css.row}>
                {showPicker && Platform.OS === 'android' && <DateTimePicker 
                    mode="date"
                    display="calendar"
                    value={getDate}
                    onChange={onChangeDate}
                    style={datepickerCSS.datePicker}
                />}        
                <Pressable style={css.pressableCSS} onPress={tonggleDatePicker} >
                    <TextInput
                        style={datepickerCSS.textInput}
                        placeholder="Select Date"
                        value={todayDate.toString().substring(0,10)}
                        onChangeText={setTodayDate}
                        placeholderTextColor="#11182744"
                        editable={false}
                        onPressIn={tonggleDatePicker}
                    />
                </Pressable>
            </View>    

            {/* End Select Date */}
            {Platform.OS === "ios" && (<DateTimePickerModal
                date={selectedIOSDate}
                isVisible={datePickerVisible}
                mode="date"
                display='inline'
                onConfirm={confirmIOSDate}
                onCancel={hideIOSDatePicker}
            />)}

            {(dataProcess==true) ? (
                <View style={[css.container]}>
                    <ActivityIndicator size="large" />
                </View>
            ) : (
                <View>
                    {(fetchedData.length==0 ) ? (
                        <View style={{alignItems: 'center',justifyContent: 'center'}}>
                            <Image
                                source={ImagesAssets.noData}
                                style={{width: Dimensions.get("window").width/100*80, height: 200}}
                            />
                            <Text style={{fontSize:16,margin:30}}>Today No data yet</Text>
                        </View>
                    ) : (
                    <View>
                        <View style={{alignItems: 'center',justifyContent: 'center'}}>
                            <View>
                            <LineChart
                                data={BarData}
                                width={Dimensions.get("window").width/100*90}
                                height={160}
                                yAxisSuffix=""
                                yAxisLabel=""
                                chartConfig={{
                                    backgroundColor: '#1cc910',
                                    backgroundGradientFrom: '#eff3ff',
                                    backgroundGradientTo: '#efefef',
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                    style: {
                                        borderRadius: 16,
                                    },
                                    propsForLabels:{
                                        fontFamily:'MontserratBold',
                                        fontSize:8,
                                    },
                                }}
                                style={{
                                    marginVertical: 8,
                                    borderRadius: 16, 
                                }}
                                
                            />
                            </View>
                        </View> 
                        
                        <View style={{height:Dimensions.get("screen").height/100*48}}>
                            <View style={[css.row,{marginTop:5,marginBottom:5,}]}>
                                <View style={{width:"80%"}}>
                                    <Text style={{fontSize:20,fontWeight:'bold',textAlign:"center",fontStyle:"italic"}}>
                                        Today Issue Amount: {totalAmount}
                                    </Text>
                                </View>
                                <View style={{width:"20%",alignItems:'flex-start',justifyContent:'center',margin:5}}>
                                    <View style={css.row}>
                                        <View style={[css.circle, { backgroundColor: "red" }]}>
                                        </View>
                                        <Text style={{fontSize:10,fontWeight:'bold',textAlign:"left",fontStyle:"italic"}}>
                                            Pending
                                        </Text>
                                    </View>
                                    <View style={css.row}>
                                        <View style={[css.circle, { backgroundColor: "yellow" }]}>
                                        </View>
                                        <Text style={{fontSize:10,fontWeight:'bold',textAlign:"left",fontStyle:"italic"}}>
                                            Picking
                                        </Text>
                                    </View>
                                    <View style={css.row}>
                                        <View style={[css.circle, { backgroundColor: "green" }]}>
                                        </View>
                                        <Text style={{fontSize:10,fontWeight:'bold',textAlign:"left",fontStyle:"italic"}}>
                                            Completed
                                        </Text>
                                    </View>
                                </View>
                            </View>
                            <View style={{alignItems: 'center',justifyContent: 'center',marginTop:10}}>
                                <View style={{}}>
                                    <FlatList
                                        data={fetchedData}
                                        renderItem={FlatListItem}
                                        keyExtractor={(item) => item.key}
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                    )}
                </View>
            )}
        </MainContainer>
    );
}

export default PickingListScreen;
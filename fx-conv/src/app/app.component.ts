import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { NodeCompatibleEventEmitter } from 'rxjs/internal/observable/fromEvent';
import histoJson from './_files/histoData.json';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'fx-conv';
  inputBaseCcy = '';

  euFlag: string = "./assets/images/euroflag.png";
  usFlag: string = "./assets/images/usaflag.png";
  exchg: string = "./assets/images/transfer.png";
  euroSign: string = "./assets/images/euro.png";
  dollarSign: string = "./assets/images/dollar.png";

  baseCcy: string = this.euFlag;
  quotedCcy: string = this.usFlag;
  baseCcySign: string = this.euroSign;
  quotedCcySign: string = this.dollarSign;

  manualOverride: number;
  inputAmt: number;
  convertedAmt: number = 0;

  headers = ["Date/Time", "Real-time Fx Rate", "Override Fx Rate", "Initial Amount", "Initial Currency", "Converted Amount", "Converted Currency"];

  amtToConv: number;
  realTimeFx: number;
  manOverride: number;

  newFixing: number = 1.1;
  newTick: number;
  updatedRecordedData: any = [];
  recordedData: any = [];
  newRecordedData: any = [];
  histo = [];

  // We generate a random number within the defined limits
  // @param: lower and upper bounds as numbers
  // @return: random value as number
  tickGenerator(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  // The previously generated number is added to or removed from the current fixing every 3 sec. to mimic a fixing process
  generateFixing() {
    setInterval(() => {
      this.newTick = parseFloat(this.tickGenerator(-0.05, 0.051).toFixed(4));
      this.newFixing += this.newTick;
      this.newFixing = parseFloat(this.newFixing.toFixed(4));
    }, 3000);
  }

  // Depending on the current position of the flags, they are switched to the other place. Additionally is a number is detected in the
  // converted field, it gets moved to the input field
  // @param: automatically capture from the UI the converted amount if any
  switchCcy(convAmt: any){
    if(this.baseCcy === this.euFlag){
      this.baseCcy = this.usFlag;
      this.quotedCcy = this.euFlag;
      this.baseCcySign = this.dollarSign;
      this.quotedCcySign = this.euroSign;
    }else{
      this.baseCcy = this.euFlag;
      this.quotedCcy = this.usFlag;
      this.baseCcySign = this.euroSign;
      this.quotedCcySign = this.dollarSign;
    }
    if(convAmt.value && convAmt.value > 0){
      this.inputAmt = convAmt.value;
      this.convertedAmt = 0;
    }
  }

  // The user inputs (manual fixing, amount to convert) and the automatic fixing are collected from the UI
  // @param: automatic fixing, manual fixing (if any) and amount to convert as numbers
  getParameters(autoFix: any, manFix: any, amt: any){
    this.realTimeFx = parseFloat(autoFix.value);
    this.manOverride = parseFloat(manFix.value);
    this.amtToConv = parseFloat(amt.value);

    // We operate the conversion into the other currency
    if(this.amtToConv){
      this.convertedAmt = this.convertAmt(this.manOverride, this.realTimeFx, this.amtToConv);
      this.convertedAmt = parseFloat(this.convertedAmt.toFixed(2));
      // We update the records with the new conversion
      this.updateHisto(this.realTimeFx, this.manOverride, this.amtToConv, this.convertedAmt);
    }else{
      window.alert("Please fill in the amount field to start converting !");
      return;
    }
  }

  // We determine whether the manual fixing or automatic fixing should be considered taking into account a difference of 2% between the two of them
  // @param: automatic fixing and manual fixing
  // @return: automatic fixing if the difference between the two is greater than 2%, otherwise the manual fixing
  autoOrMan(autoFixing: number, manFixing: number){
    if(Math.abs(autoFixing - manFixing) >= (2/100)){
      return autoFixing;
    }else{
      return manFixing;
    }
  }

  // Depending on the current position of the flag, wwe determine how to operate the conversion
  // @param: manual fixing, automatic fixing and amount to convert as numbers
  // @return: the converted amount as a number
  convertAmt(manOverride: number, currFx: number, toConvAmt: number){
    if(manOverride){
      if(this.baseCcy === this.euFlag){
        return toConvAmt * this.autoOrMan(currFx, manOverride);
      }else{
        return toConvAmt / this.autoOrMan(currFx, manOverride);
      }
    }else{
      if(this.baseCcy === this.euFlag){
        return toConvAmt * currFx;
      }else{
        return toConvAmt / currFx;
      }
    }
  }

  // We save the data currently detected in the table from the HTML page
  // @param: an array of one object containing the headers of the HTML table
  recordTableData(tableParam: [{
      "timestamp": string,
      "realtimeFx": string,
      "overrideFx": string,
      "initalAmt": string,
      "initialCcy": string,
      "convAmt": string,
      "convCcy": string
    }]){
    const table: HTMLTableElement = document.querySelector('#histoTable');
    const rows = table.tBodies[0].rows;
    let i = 0;

    Array.from(rows).forEach((row, idx) => {
      const tds = Array.from(row.cells).map(td => td.textContent);
      tableParam[i].timestamp = tds[0];
      tableParam[i].realtimeFx = tds[1];
      tableParam[i].overrideFx = tds[2];
      tableParam[i].initalAmt = tds[3];
      tableParam[i].initialCcy = tds[4];
      tableParam[i].convAmt = tds[5];
      tableParam[i].convCcy = tds[6];
      i++;
    });
  }

  // Considering the data contained in the HTML table, additional row are added when a new conversion is performed
  // @param: automatic fixing, manual fixing, amount to convert, converted amount as numbers
  updateHisto(autoFixing: any, manualFixing: any, inputAmount: any, convertedAmount: any){
    this.headers = ["Date/Time", "Real-time Fx Rate", "Override Fx Rate", "Initial Amount", "Initial Currency", "Converted Amount", "Converted Currency"];

    this.recordTableData(this.newRecordedData);

    let nbRows = Object.keys(this.newRecordedData).length;

    // Depending on the number of existing rows, they are being moved to the row below to make room for the new input at the top
    if(nbRows === 1){
      let secondRow = {
        "timestamp": this.newRecordedData[0].timestamp,
        "realtimeFx": this.newRecordedData[0].realtimeFx,
        "overrideFx": this.newRecordedData[0].overrideFx,
        "initalAmt": this.newRecordedData[0].initalAmt,
        "initialCcy": this.newRecordedData[0].initialCcy,
        "convAmt": this.newRecordedData[0].convAmt,
        "convCcy": this.newRecordedData[0].convCcy
      }
      this.newRecordedData[1] = secondRow;
    }else if(nbRows === 2){
      let thirdRow = {
        "timestamp": this.newRecordedData[1].timestamp,
        "realtimeFx": this.newRecordedData[1].realtimeFx,
        "overrideFx": this.newRecordedData[1].overrideFx,
        "initalAmt": this.newRecordedData[1].initalAmt,
        "initialCcy": this.newRecordedData[1].initialCcy,
        "convAmt": this.newRecordedData[1].convAmt,
        "convCcy": this.newRecordedData[1].convCcy
      }
      let secondRow = {
        "timestamp": this.newRecordedData[0].timestamp,
        "realtimeFx": this.newRecordedData[0].realtimeFx,
        "overrideFx": this.newRecordedData[0].overrideFx,
        "initalAmt": this.newRecordedData[0].initalAmt,
        "initialCcy": this.newRecordedData[0].initialCcy,
        "convAmt": this.newRecordedData[0].convAmt,
        "convCcy": this.newRecordedData[0].convCcy
      }
      this.newRecordedData[2] = thirdRow;
      this.newRecordedData[1] = secondRow;
    }else if(nbRows === 3){
      let fourthRow = {
        "timestamp": this.newRecordedData[2].timestamp,
        "realtimeFx": this.newRecordedData[2].realtimeFx,
        "overrideFx": this.newRecordedData[2].overrideFx,
        "initalAmt": this.newRecordedData[2].initalAmt,
        "initialCcy": this.newRecordedData[2].initialCcy,
        "convAmt": this.newRecordedData[2].convAmt,
        "convCcy": this.newRecordedData[2].convCcy
      }
      let thirdRow = {
        "timestamp": this.newRecordedData[1].timestamp,
        "realtimeFx": this.newRecordedData[1].realtimeFx,
        "overrideFx": this.newRecordedData[1].overrideFx,
        "initalAmt": this.newRecordedData[1].initalAmt,
        "initialCcy": this.newRecordedData[1].initialCcy,
        "convAmt": this.newRecordedData[1].convAmt,
        "convCcy": this.newRecordedData[1].convCcy
      }
      let secondRow = {
        "timestamp": this.newRecordedData[0].timestamp,
        "realtimeFx": this.newRecordedData[0].realtimeFx,
        "overrideFx": this.newRecordedData[0].overrideFx,
        "initalAmt": this.newRecordedData[0].initalAmt,
        "initialCcy": this.newRecordedData[0].initialCcy,
        "convAmt": this.newRecordedData[0].convAmt,
        "convCcy": this.newRecordedData[0].convCcy
      }
      this.newRecordedData[3] = fourthRow;
      this.newRecordedData[2] = thirdRow;
      this.newRecordedData[1] = secondRow;
    }else if(nbRows >= 4){
      let fifthRow = {
        "timestamp": this.newRecordedData[3].timestamp,
        "realtimeFx": this.newRecordedData[3].realtimeFx,
        "overrideFx": this.newRecordedData[3].overrideFx,
        "initalAmt": this.newRecordedData[3].initalAmt,
        "initialCcy": this.newRecordedData[3].initialCcy,
        "convAmt": this.newRecordedData[3].convAmt,
        "convCcy": this.newRecordedData[3].convCcy
      }
      let fourthRow = {
        "timestamp": this.newRecordedData[2].timestamp,
        "realtimeFx": this.newRecordedData[2].realtimeFx,
        "overrideFx": this.newRecordedData[2].overrideFx,
        "initalAmt": this.newRecordedData[2].initalAmt,
        "initialCcy": this.newRecordedData[2].initialCcy,
        "convAmt": this.newRecordedData[2].convAmt,
        "convCcy": this.newRecordedData[2].convCcy
      }
      let thirdRow = {
        "timestamp": this.newRecordedData[1].timestamp,
        "realtimeFx": this.newRecordedData[1].realtimeFx,
        "overrideFx": this.newRecordedData[1].overrideFx,
        "initalAmt": this.newRecordedData[1].initalAmt,
        "initialCcy": this.newRecordedData[1].initialCcy,
        "convAmt": this.newRecordedData[1].convAmt,
        "convCcy": this.newRecordedData[1].convCcy
      }
      let secondRow = {
        "timestamp": this.newRecordedData[0].timestamp,
        "realtimeFx": this.newRecordedData[0].realtimeFx,
        "overrideFx": this.newRecordedData[0].overrideFx,
        "initalAmt": this.newRecordedData[0].initalAmt,
        "initialCcy": this.newRecordedData[0].initialCcy,
        "convAmt": this.newRecordedData[0].convAmt,
        "convCcy": this.newRecordedData[0].convCcy
      }
      this.newRecordedData[4] = fifthRow;
      this.newRecordedData[3] = fourthRow;
      this.newRecordedData[2] = thirdRow;
      this.newRecordedData[1] = secondRow;
    }

    let newOne: any = {
      "timestamp": "",
      "realtimeFx": "",
      "overrideFx": "",
      "initalAmt": "",
      "initialCcy": "",
      "convAmt": "",
      "convCcy": ""
    };

    // The data from the last conversion are saved in the newOne object
    newOne.timestamp = new Date().toLocaleString();

    if(manualFixing && ((Math.abs(parseFloat(autoFixing) - parseFloat(manualFixing))) < (2/100))){
      newOne.realtimeFx = "";
      newOne.overrideFx = manualFixing.toString();
    }else{
      newOne.realtimeFx = autoFixing.toString();
      newOne.overrideFx = "";
    }

    newOne.initalAmt = inputAmount.toString();

    if(this.baseCcy === this.euFlag){
      newOne.initialCcy = "EUR";
      newOne.convCcy = "USD";
    }else{
      newOne.initialCcy = "USD";
      newOne.convCcy = "EUR";
    }

    newOne.convAmt = convertedAmount.toString();

    // The 1st object of the recorded data is updated with the last performed conversion
    this.newRecordedData[0] = newOne;

    // The updated table is displayed on the HTML page
    this.histo = this.newRecordedData;
  }

  ngOnInit(){
    this.generateFixing();
  }
}

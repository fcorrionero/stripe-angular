import {
  AfterViewInit,
  Component,
  Input,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  Output,
  EventEmitter, ChangeDetectorRef
} from '@angular/core';
import { FormControl } from '@angular/forms';
import Keyboard from 'simple-keyboard';
import { MatInput } from '@angular/material';
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE} from '@angular/material/core';
import {MatDatepicker} from '@angular/material/datepicker';
import * as _moment from 'moment';
// import {default as _rollupMoment, Moment } from 'moment';
import { Moment } from 'moment';
import {MomentDateAdapter} from '@angular/material-moment-adapter';
import { environment } from '../../../environments/environment';
import axios from 'axios';

const moment = _moment;
// See the Moment.js docs for the meaning of these formats:
// https://momentjs.com/docs/#/displaying/format/
export const MY_FORMATS = {
  parse: {
    dateInput: 'MM/YY',
  },
  display: {
    dateInput: 'MM/YY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

@Component({
  selector: 'app-stripe',
  templateUrl: './stripe.component.html',
  styleUrls: ['./stripe.component.css', './index.css'],
  providers: [
    // `MomentDateAdapter` can be automatically provided by importing `MomentDateModule` in your
    // application's root module.
    {provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE]},
    {provide: MAT_DATE_FORMATS, useValue: MY_FORMATS}
  ],
})
export class StripeComponent implements OnInit, AfterViewInit {

  @ViewChild('cardNum') cardField: MatInput;
  @Output() paymentCompleted: EventEmitter<boolean> = new EventEmitter();

  cardNumber: any;
  cardName: any;
  expiryMonth: any;
  expiryYear: any;
  expiryText: any;
  cvc: any;
  selectedInput: any;
  paymentDone = false;
  loading = false;
  keyboard: Keyboard;
  error: string;
  date = new FormControl(moment());

  constructor(private cdRef: ChangeDetectorRef) {
    this.openKeyboard();
  }

  ngOnInit() {
    (<any> window).Stripe.setPublishableKey(environment.stripePk);
  }

  getToken() {
    this.expiryText = this.formatExpiryText();
    this.loading = true;
    const expiryData = this.expiryText.split('/');
    if (undefined === expiryData[1]) {
      this.loading = false;
      return;
    }
    this.expiryMonth = parseInt(expiryData[0], 10);
    this.expiryYear = parseInt(expiryData[1], 10);
    (<any> window).Stripe.card.createToken({
      number: this.cardNumber,
      exp_month: this.expiryMonth,
      exp_year: this.expiryYear,
      cvc: this.cvc,
      name: this.cardName,
    }, (status: number, response: any) => {
      if (status === 200) {
        console.log(response);
        this.sendToken(response);
      } else {
        this.loading = false;
        this.error = response.error.message;
        console.log(response.error.message);
        this.cdRef.detectChanges();
      }
    });
  }

  async sendToken(token: any) {
    const config = {
      auth: {
        username: environment.userToken,
        password: environment.userToken
      }
    };
    try {
      const response = await axios.post(environment.api + '/v1/checkin/payment', {
        data: token.id,
        id: ''
      }, config );
      console.log(response.data);
      if (response.data[0] === 'success - payment created') {
        this.loading = false;
        this.paymentDone = true;
        this.paymentCompleted.emit(true);
        return true;
        // this.glob.checkIsPaymentAccepted(response.data[0]);
      } else if (response.data.length === 0) {
        this.loading = false;
        document.getElementById('paymentNoAccepted').style.visibility = 'visible';
        return false;
      }
    } catch (e) {
      this.loading = false;
      document.getElementById('paymentNoAccepted').style.visibility = 'visible';
      console.log(e);
    }
  }

  ngAfterViewInit() {
    this.cardField.focus();
    this.cardField.focused = true;
    this.openKeyboard();
  }

  chosenYearHandler(normalizedYear: Moment) {
    const ctrlValue = this.date.value;
    ctrlValue.year(normalizedYear.year());
    this.date.setValue(ctrlValue);
  }

  chosenMonthHandler(normalizedMonth: Moment, datepicker: MatDatepicker<Moment>) {
    const ctrlValue = this.date.value;
    ctrlValue.month(normalizedMonth.month());
    this.date.setValue(ctrlValue);
    datepicker.close();
    this.expiryYear = ctrlValue.format('MM') + '/' + ctrlValue.format('YY');
  }

  openKeyboard() {
    this.keyboard = new Keyboard({
      onChange: input => this.onChange(input),
      onKeyPress: button => this.onKeyPress(button)
    });
  }

  onInputFocus(event: any) {
    // Setting input as selected
    this.selectedInput = `#${event.target.id}`;

    // Set the inputName option on the fly !
    this.keyboard.setOptions({
      inputName: event.target.id
    });
  }

  onInputChange(event: any) {
    this.keyboard.setInput(event.target.value, event.target.id);
  }

  onChange(input: string) {
    document.querySelector(this.selectedInput).value = input;
    if ('#cardNum' === this.selectedInput) {
      this.cardNumber = input;
    }
    if ('#cardCVC' === this.selectedInput) {
      this.cvc = input;
    }
    if ('#cardName' === this.selectedInput) {
      this.cardName = input;
    }
  }

  onKeyPress(button: string) {
    /**
     * If you want to handle the shift and caps lock buttons
     */
    if (button === '{shift}' || button === '{lock}') {
      this.handleShift();
    }
  }

  handleShift() {
    const currentLayout = this.keyboard.options.layoutName;
    const shiftToggle = currentLayout === 'default' ? 'shift' : 'default';

    this.keyboard.setOptions({
      layoutName: shiftToggle
    });
  }

  formatExpiryText() {
    const ctrlValue = this.date.value;
    return ctrlValue.format('MM') + '/' + ctrlValue.format('YY');
  }

}
